import { Router } from "express";
import { eq, or, and, ilike, ne, sql, inArray, desc } from "drizzle-orm";
import { db, users, friendships, dailyLogs } from "@workspace/db";

const router = Router();

/**
 * POST /api/friends/request
 * Send a friend request
 */
router.post("/friends/request", async (req, res, next) => {
  try {
    const { requesterId, addresseeId } = req.body;

    if (!requesterId || !addresseeId) {
      res.status(400).json({ error: "requesterId and addresseeId are required" });
      return;
    }

    if (requesterId === addresseeId) {
      res.status(400).json({ error: "Cannot send a friend request to yourself" });
      return;
    }

    // Check both users exist
    const [requester] = await db.select({ id: users.id }).from(users).where(eq(users.id, requesterId));
    const [addressee] = await db.select({ id: users.id }).from(users).where(eq(users.id, addresseeId));

    if (!requester || !addressee) {
      res.status(404).json({ error: "One or both users not found" });
      return;
    }

    // Check if a friendship already exists in either direction
    const [existing] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
        and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId))
      )
    );

    if (existing) {
      if (existing.status === "accepted") {
        res.status(409).json({ error: "Already friends" });
        return;
      }
      if (existing.status === "pending") {
        // If the other person already sent a request, auto-accept
        if (existing.requesterId === addresseeId) {
          const [updated] = await db.update(friendships)
            .set({ status: "accepted", updatedAt: new Date() })
            .where(eq(friendships.id, existing.id))
            .returning();
          res.status(200).json({ ...updated, autoAccepted: true });
          return;
        }
        res.status(409).json({ error: "Friend request already pending" });
        return;
      }
      if (existing.status === "rejected") {
        // Allow re-sending after rejection — update the existing row
        const [updated] = await db.update(friendships)
          .set({ status: "pending", requesterId, addresseeId, updatedAt: new Date() })
          .where(eq(friendships.id, existing.id))
          .returning();
        res.status(201).json(updated);
        return;
      }
    }

    // Create new friendship request
    const [newRequest] = await db.insert(friendships).values({
      requesterId,
      addresseeId,
      status: "pending",
    }).returning();

    res.status(201).json(newRequest);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/friends/:userId
 * Get accepted friends list with their public profile data
 */
router.get("/friends/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Get all accepted friendships where this user is either requester or addressee
    const acceptedFriendships = await db.select().from(friendships).where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        )
      )
    );

    // Get friend user IDs
    const friendIds = acceptedFriendships.map(f =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    if (friendIds.length === 0) {
      res.json({ friends: [] });
      return;
    }

    // Fetch friend profiles
    const friendProfiles = await db.select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      totalXP: users.totalXP,
      highestStreak: users.highestStreak,
      activeProgramIds: users.activeProgramIds,
      startDate: users.startDate,
    }).from(users).where(
      inArray(users.id, friendIds)
    );

    // Fetch last active date for each friend (most recent daily_log date)
    const lastActiveLogs = await db
      .selectDistinctOn([dailyLogs.userId], {
        userId: dailyLogs.userId,
        date: dailyLogs.date,
      })
      .from(dailyLogs)
      .where(inArray(dailyLogs.userId, friendIds))
      .orderBy(dailyLogs.userId, desc(dailyLogs.date));

    const lastActiveMap = Object.fromEntries(
      lastActiveLogs.map(log => [log.userId, log.date])
    );

    // Attach friendship ID, lastActive, and computed level
    const friendsWithMeta = friendProfiles.map(profile => {
      const friendship = acceptedFriendships.find(f =>
        f.requesterId === profile.id || f.addresseeId === profile.id
      );
      const xp = profile.totalXP || 0;
      const level = Math.floor(Math.sqrt(xp / 100)) + 1;
      return {
        ...profile,
        level,
        lastActive: lastActiveMap[profile.id] || null,
        friendshipId: friendship?.id,
        friendsSince: friendship?.updatedAt,
      };
    });

    res.json({ friends: friendsWithMeta });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/friends/:userId/requests
 * Get incoming pending friend requests
 */
router.get("/friends/:userId/requests", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const pendingRequests = await db.select().from(friendships).where(
      and(
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "pending")
      )
    );

    if (pendingRequests.length === 0) {
      res.json({ requests: [] });
      return;
    }

    // Fetch requester profiles
    const requesterIds = pendingRequests.map(r => r.requesterId);
    const requesterProfiles = await db.select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      totalXP: users.totalXP,
      highestStreak: users.highestStreak,
      activeProgramIds: users.activeProgramIds,
    }).from(users).where(
      inArray(users.id, requesterIds)
    );

    const requestsWithProfiles = pendingRequests.map(request => {
      const profile = requesterProfiles.find(p => p.id === request.requesterId);
      const xp = profile?.totalXP || 0;
      const level = Math.floor(Math.sqrt(xp / 100)) + 1;
      return {
        friendshipId: request.id,
        createdAt: request.createdAt,
        requester: profile ? { ...profile, level } : null,
      };
    });

    res.json({ requests: requestsWithProfiles });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/friends/:friendshipId/respond
 * Accept or reject a friend request
 */
router.patch("/friends/:friendshipId/respond", async (req, res, next) => {
  try {
    const { friendshipId } = req.params;
    const { action } = req.body; // 'accept' | 'reject'

    if (!action || !["accept", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be 'accept' or 'reject'" });
      return;
    }

    const [friendship] = await db.select().from(friendships).where(eq(friendships.id, friendshipId));

    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    if (friendship.status !== "pending") {
      res.status(400).json({ error: `Cannot respond to a ${friendship.status} request` });
      return;
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    const [updated] = await db.update(friendships)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId))
      .returning();

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/friends/:friendshipId
 * Remove a friend or cancel a pending request
 */
router.delete("/friends/:friendshipId", async (req, res, next) => {
  try {
    const { friendshipId } = req.params;

    const [friendship] = await db.select().from(friendships).where(eq(friendships.id, friendshipId));

    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    await db.delete(friendships).where(eq(friendships.id, friendshipId));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/friends/:userId/status/:otherUserId
 * Check the relationship status between two users
 */
router.get("/friends/:userId/status/:otherUserId", async (req, res, next) => {
  try {
    const { userId, otherUserId } = req.params;

    const [friendship] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherUserId)),
        and(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, userId))
      )
    );

    if (!friendship) {
      res.json({ status: "none", friendshipId: null });
      return;
    }

    if (friendship.status === "accepted") {
      res.json({ status: "friends", friendshipId: friendship.id });
      return;
    }

    if (friendship.status === "pending") {
      if (friendship.requesterId === userId) {
        res.json({ status: "pending_sent", friendshipId: friendship.id });
      } else {
        res.json({ status: "pending_received", friendshipId: friendship.id });
      }
      return;
    }

    // Rejected — treat as "none" for UX purposes (allow re-request)
    res.json({ status: "none", friendshipId: null });
  } catch (error) {
    next(error);
  }
});

export default router;
