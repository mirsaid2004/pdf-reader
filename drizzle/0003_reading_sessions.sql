CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"pages_read" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "reading_sessions_ended_after_started" CHECK ("reading_sessions"."ended_at" >= "reading_sessions"."started_at")
);
--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reading_sessions_user_id_started_at_idx" ON "reading_sessions" USING btree ("user_id","started_at" desc);--> statement-breakpoint
CREATE INDEX "reading_sessions_book_id_idx" ON "reading_sessions" USING btree ("book_id");