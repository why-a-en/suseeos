ALTER TABLE "orders" ADD COLUMN "order_number" integer;
--> statement-breakpoint
-- Backfill: dev/seed data only (ADR-0005's risk posture) — a random draw
-- per existing row, same distribution the app itself uses going forward
-- (services/orders.ts's pickOrderNumber). A collision here is as
-- vanishingly unlikely as it is for a real save; if it ever happens, the
-- unique index below fails to create and this just gets rerun.
UPDATE "orders" SET "order_number" = 100000 + floor(random() * 900000)::int WHERE "order_number" IS NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_organization_order_number_unique" ON "orders" USING btree ("organization_id","order_number");
