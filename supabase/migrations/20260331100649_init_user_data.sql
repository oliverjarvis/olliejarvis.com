
  create table "public"."user_data" (
    "user_id" uuid not null,
    "learner_profile" jsonb,
    "word_journal" jsonb default '{}'::jsonb,
    "grammar_patterns" jsonb default '{}'::jsonb,
    "conversation_history" jsonb default '[]'::jsonb,
    "saved_conversations" jsonb default '{}'::jsonb,
    "ai_conversations" jsonb default '[]'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_data" enable row level security;

CREATE UNIQUE INDEX user_data_pkey ON public.user_data USING btree (user_id);

alter table "public"."user_data" add constraint "user_data_pkey" PRIMARY KEY using index "user_data_pkey";

alter table "public"."user_data" add constraint "user_data_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_data" validate constraint "user_data_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."user_data" to "anon";

grant insert on table "public"."user_data" to "anon";

grant references on table "public"."user_data" to "anon";

grant select on table "public"."user_data" to "anon";

grant trigger on table "public"."user_data" to "anon";

grant truncate on table "public"."user_data" to "anon";

grant update on table "public"."user_data" to "anon";

grant delete on table "public"."user_data" to "authenticated";

grant insert on table "public"."user_data" to "authenticated";

grant references on table "public"."user_data" to "authenticated";

grant select on table "public"."user_data" to "authenticated";

grant trigger on table "public"."user_data" to "authenticated";

grant truncate on table "public"."user_data" to "authenticated";

grant update on table "public"."user_data" to "authenticated";

grant delete on table "public"."user_data" to "service_role";

grant insert on table "public"."user_data" to "service_role";

grant references on table "public"."user_data" to "service_role";

grant select on table "public"."user_data" to "service_role";

grant trigger on table "public"."user_data" to "service_role";

grant truncate on table "public"."user_data" to "service_role";

grant update on table "public"."user_data" to "service_role";


  create policy "Users can delete own data"
  on "public"."user_data"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own data"
  on "public"."user_data"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own data"
  on "public"."user_data"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view own data"
  on "public"."user_data"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER user_data_updated_at BEFORE UPDATE ON public.user_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


