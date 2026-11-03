CREATE TABLE "reading_progress" (
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"current_page" integer DEFAULT 1 NOT NULL,
	"percent" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_progress_user_id_book_id_pk" PRIMARY KEY("user_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "shelf_books" (
	"shelf_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shelf_books_shelf_id_book_id_pk" PRIMARY KEY("shelf_id","book_id")
);
--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_books" ADD CONSTRAINT "shelf_books_shelf_id_shelves_id_fk" FOREIGN KEY ("shelf_id") REFERENCES "public"."shelves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_books" ADD CONSTRAINT "shelf_books_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shelf_books_book_id_idx" ON "shelf_books" USING btree ("book_id");