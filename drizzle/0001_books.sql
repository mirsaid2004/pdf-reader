CREATE TABLE "books" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"file_key" text NOT NULL,
	"cover_key" text,
	"page_count" integer NOT NULL,
	"file_size" bigint NOT NULL,
	"has_text_layer" boolean NOT NULL,
	"outline" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_file_key_unique" UNIQUE("file_key")
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "books_user_id_created_at_idx" ON "books" USING btree ("user_id","created_at" desc);