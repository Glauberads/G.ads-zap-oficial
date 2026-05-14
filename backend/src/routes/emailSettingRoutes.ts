import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as EmailSettingController from "../controllers/EmailSettingController";

const routes = Router();

routes.get("/email-settings", isAuth, EmailSettingController.show);
routes.put("/email-settings", isAuth, EmailSettingController.update);

export default routes;