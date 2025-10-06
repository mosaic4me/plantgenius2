import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { sendEmailProcedure } from "./routes/contact/send-email/route";

export const appRouter = createTRPCRouter({
    example: createTRPCRouter({
        hi: hiRoute,
    }),
    contact: createTRPCRouter({
        sendEmail: sendEmailProcedure,
    }),
});

export type AppRouter = typeof appRouter;
