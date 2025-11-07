CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"token_in" varchar(100) NOT NULL,
	"token_out" varchar(100) NOT NULL,
	"amount_in" numeric(20, 8) NOT NULL,
	"amount_out" numeric(20, 8),
	"expected_price" numeric(20, 8),
	"executed_price" numeric(20, 8),
	"slippage" numeric(5, 4) DEFAULT '0.01' NOT NULL,
	"dex_provider" varchar(20),
	"tx_hash" varchar(200),
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
