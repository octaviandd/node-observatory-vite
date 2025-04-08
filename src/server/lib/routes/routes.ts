import { Router } from "express";
import { watchers } from "../logger";

const router = Router();

router.get("/dashboard", (req, res) => {
  watchers.dashboard.getIndex(req, res);
});

router.get("/requests", (req, res) => watchers.requests.getIndex(req, res));
router.get("/requests/:id", (req, res) => watchers.requests.getView(req, res));
router.post("/requests/:id/related", (req, res) => watchers.requests.getRelatedData(req, res));
router.get("/requests/refresh", (req, res) => watchers.requests.refreshData(req, res));

router.get("/queries", (req, res) => watchers.query.getIndex(req, res));
router.get("/queries/:id", (req, res) => watchers.query.getView(req, res));
router.post("/queries/:id/related", (req, res) => watchers.query.getRelatedData(req, res));
router.get("/queries/refresh", (req, res) => watchers.query.refreshData(req, res));

router.get("/notifications", (req, res) => watchers.notifications.getIndex(req, res));
router.get("/notifications/:id", (req, res) => watchers.notifications.getView(req, res));
router.post("/notifications/:id/related", (req, res) => watchers.notifications.getRelatedData(req, res));
router.get("/notifications/refresh", (req, res) => watchers.notifications.refreshData(req, res));

router.get("/mails", (req, res) => watchers.mailer.getIndex(req, res));
router.get("/mails/:id", (req, res) => watchers.mailer.getView(req, res));
router.post("/mails/:id/related", (req, res) => watchers.mailer.getRelatedData(req, res));
router.get("/mails/refresh", (req, res) => watchers.mailer.refreshData(req, res));

router.get("/redis", (req, res) => watchers.redis.getIndex(req, res));
router.get("/redis/:redisRowId", (req, res) => watchers.redis.getView(req, res));
router.get("/redis/refresh", (req, res) => watchers.redis.refreshData(req, res));
router.post("/redis/:id/related", (req, res) => watchers.redis.getRelatedData(req, res));

router.get("/exceptions", (req, res) => watchers.errors.getIndex(req, res));
router.get("/exceptions/:id", (req, res) => watchers.errors.getView(req, res));
router.post("/exceptions/:id/related", (req, res) => watchers.errors.getRelatedData(req, res));
router.get("/exceptions/refresh", (req, res) => watchers.errors.refreshData(req, res));

router.get("/jobs", (req, res) => watchers.jobs.getIndex(req, res));
router.get("/jobs/:id", (req, res) => watchers.jobs.getView(req, res));
router.post("/jobs/:id/related", (req, res) => watchers.jobs.getRelatedData(req, res));
router.get("/jobs/refresh", (req, res) => watchers.jobs.refreshData(req, res));

router.get("/schedules", (req, res) => watchers.scheduler.getIndex(req, res));
router.get("/schedules/:id", (req, res) => watchers.scheduler.getView(req, res));
router.post("/schedules/:id/related", (req, res) => watchers.scheduler.getRelatedData(req, res));
router.get("/schedules/refresh", (req, res) => watchers.scheduler.refreshData(req, res));

router.get("/https", (req, res) => watchers.http.getIndex(req, res));
router.get("/http/:id", (req, res) => watchers.http.getView(req, res));
router.post("/http/:id/related", (req, res) => watchers.http.getRelatedData(req, res));
router.get("/http/refresh", (req, res) => watchers.http.refreshData(req, res));

router.get("/cache", (req, res) => watchers.cache.getIndex(req, res));
router.get("/cache/:id", (req, res) => watchers.cache.getView(req, res));
router.post("/cache/:id/related", (req, res) => watchers.cache.getRelatedData(req, res));
router.get("/cache/refresh", (req, res) => watchers.cache.refreshData(req, res));

router.get("/logs", (req, res) => watchers.logging.getIndex(req, res));
router.get("/logs/:id", (req, res) => watchers.logging.getView(req, res));
router.post("/logs/:id/related", (req, res) => watchers.logging.getRelatedData(req, res));
router.get("/logs/refresh", (req, res) => watchers.logging.refreshData(req, res));

router.get("/views", (req, res) => { watchers.view.getIndex(req, res) });
router.get("/views/:id", (req, res) => { watchers.view.getView(req, res) });
router.get("/views/refresh", (req, res) => watchers.view.refreshData(req, res));
router.post("/views/:id/related", (req, res) => watchers.view.getRelatedData(req, res));

router.get("/models", (req, res) => { watchers.model.getIndex(req, res) });
router.get("/models/:id", (req, res) => { watchers.model.getView(req, res) });
router.post("/models/:id/related", (req, res) => watchers.model.getRelatedData(req, res));
router.get("/models/refresh", (req, res) => watchers.model.refreshData(req, res));


export default router;
