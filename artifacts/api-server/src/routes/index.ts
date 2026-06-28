import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import programsRouter from "./programs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(programsRouter);

export default router;
