import { z } from "zod";

export const RawPhoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[\d+\s()\-]+$/);

export const OtpCodeSchema = z.string().trim().min(4).max(8).regex(/^\d+$/);

export const OrderIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const OrderStatusSchema = z.enum([
  "new",
  "pending_payment",
  "paid",
  "processing",
  "completed",
  "cancelled",
  "canceled",
  "shipped",
  "delivered",
]);
