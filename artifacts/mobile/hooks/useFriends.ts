import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

export interface SocialLinks {
  instagram?: string;
  snapchat?: string;
  telegram?: string;
}

export interface FriendProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  totalXP: number;
  level?: number;
  highestStreak: number;
  activeProgramIds: string[];
  socialLinks?: SocialLinks;
  friendshipId?: string;
  friendsSince?: string;
  lastActive?: string | null; // ISO date YYYY-MM-DD of last daily log
}

export interface FriendRequest {
  friendshipId: string;
  createdAt: string;
  requester: FriendProfile;
}

export interface PublicProfile extends FriendProfile {
  startDate: string;
  averageScore: number;
  daysTracked: number;
  journalCount: number;
  friendCount: number;
  completedChallenges: number;
  isProfilePublic: boolean;
  programProgress: Array<{
    programId: string;
    currentWeek: number;
    completedWeeks: number[];
    resetCount: number;
  }>;
  publishedPrograms: Array<{
    id: string;
    title: string;
    emoji: string;
    description: string;
    totalWeeks: number;
    color: string;
    isPublished: boolean;
  }>;
}

export function useFriends(userId: string | null) {
  const queryClient = useQueryClient();

  const friendsQuery = useQuery({
    queryKey: ['friends', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await customFetch<{ friends: FriendProfile[] }>(`/friends/${userId}`);
      return res.friends || [];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const requestsQuery = useQuery({
    queryKey: ['friendRequests', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await customFetch<{ requests: FriendRequest[] }>(`/friends/${userId}/requests`);
      return res.requests || [];
    },
    enabled: !!userId,
    staleTime: 15_000,
  });

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!userId) throw new Error('Not logged in');
      return customFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ requesterId: userId, addresseeId }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests', userId] });
    },
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ friendshipId, action }: { friendshipId: string; action: 'accept' | 'reject' }) => {
      return customFetch(`/friends/${friendshipId}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests', userId] });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      return customFetch(`/friends/${friendshipId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests', userId] });
    },
  });

  const searchUsers = async (query: string): Promise<FriendProfile[]> => {
    if (!query || query.length < 2) return [];
    const res = await customFetch<{ users: FriendProfile[] }>(`/users/search?q=${encodeURIComponent(query)}&excludeUserId=${userId}`);
    return res.users || [];
  };

  const getRelationshipStatus = async (otherUserId: string) => {
    if (!userId) return { status: 'none', friendshipId: null };
    const res = await customFetch<{ status: string; friendshipId: string | null }>(`/friends/${userId}/status/${otherUserId}`);
    return res;
  };

  return {
    friends: friendsQuery.data || [],
    isLoadingFriends: friendsQuery.isLoading,
    requests: requestsQuery.data || [],
    isLoadingRequests: requestsQuery.isLoading,
    sendRequest: sendRequest.mutateAsync,
    isSendingRequest: sendRequest.isPending,
    respondToRequest: respondToRequest.mutateAsync,
    isResponding: respondToRequest.isPending,
    removeFriend: removeFriend.mutateAsync,
    searchUsers,
    getRelationshipStatus,
    refetchAll: () => {
      friendsQuery.refetch();
      requestsQuery.refetch();
    },
  };
}
