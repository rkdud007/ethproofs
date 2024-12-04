SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."key_mode" AS ENUM (
    'read',
    'write',
    'all',
    'upload'
);


ALTER TYPE "public"."key_mode" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_cluster_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_id INTEGER;
BEGIN
    -- Get the next available cluster_id for the user
    SELECT COALESCE(MAX(cluster_id), 0) + 1 INTO next_id
    FROM clusters
    WHERE user_id = NEW.user_id;

    -- Assign the cluster_id
    NEW.cluster_id = next_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_cluster_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_allowed_apikey"("apikey" "text", "keymode" "public"."key_mode"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$Begin
  RETURN (SELECT EXISTS (SELECT 1
  FROM api_auth_tokens
  WHERE token=uuid(apikey)
  AND mode=ANY(keymode)));
End;$$;


ALTER FUNCTION "public"."is_allowed_apikey"("apikey" "text", "keymode" "public"."key_mode"[]) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."api_auth_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mode" "public"."key_mode" DEFAULT 'read'::"public"."key_mode" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."api_auth_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aws_instance_pricing" (
    "id" bigint NOT NULL,
    "instance_type" character varying NOT NULL,
    "region" character varying NOT NULL,
    "hourly_price" real NOT NULL,
    "instance_memory" real NOT NULL,
    "vcpu" smallint NOT NULL,
    "instance_storage" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."aws_instance_pricing" OWNER TO "postgres";


ALTER TABLE "public"."aws_instance_pricing" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."aws_instance_pricing_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."blocks" (
    "block_number" bigint NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "gas_used" bigint NOT NULL,
    "transaction_count" smallint NOT NULL,
    "total_fees" bigint NOT NULL,
    "hash" "text" NOT NULL
);


ALTER TABLE "public"."blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cluster_configurations" (
    "id" bigint NOT NULL,
    "cluster_id" "uuid" NOT NULL,
    "instance_type_id" bigint NOT NULL,
    "instance_count" smallint NOT NULL
);


ALTER TABLE "public"."cluster_configurations" OWNER TO "postgres";


ALTER TABLE "public"."cluster_configurations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cluster_configurations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."clusters" (
    "cluster_id" smallint,
    "cluster_name" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cluster_description" "text",
    "cluster_hardware" "text",
    "cluster_cycle_type" character varying
);


ALTER TABLE "public"."clusters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proofs" (
    "proof_id" integer NOT NULL,
    "block_number" bigint NOT NULL,
    "proof" "bytea",
    "proof_status" "text" NOT NULL,
    "prover_duration" interval,
    "proving_cost" numeric(10,2),
    "proving_cycles" bigint,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "proved_timestamp" timestamp with time zone,
    "proving_timestamp" timestamp with time zone,
    "queued_timestamp" timestamp with time zone,
    "proof_latency" integer,
    "cluster_id" "uuid" NOT NULL,
    CONSTRAINT "proofs_proof_status_check" CHECK (("proof_status" = ANY (ARRAY['queued'::"text", 'proving'::"text", 'proved'::"text"])))
);


ALTER TABLE "public"."proofs" OWNER TO "postgres";


ALTER TABLE "public"."proofs" ALTER COLUMN "proof_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."proofs_proof_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."recent_summary" AS
 SELECT "count"(DISTINCT "b"."block_number") AS "total_proven_blocks",
    COALESCE("avg"("p"."proving_cost"), (0)::numeric) AS "avg_cost_per_proof",
    COALESCE("avg"("p"."proof_latency"), (0)::numeric) AS "avg_proof_latency"
   FROM ("public"."blocks" "b"
     JOIN "public"."proofs" "p" ON (("b"."block_number" = "p"."block_number")))
  WHERE ("b"."timestamp" >= ("now"() - '30 days'::interval));


ALTER TABLE "public"."recent_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recursive_root_proofs" (
    "root_proof_id" integer NOT NULL,
    "block_number" bigint,
    "root_proof" "bytea" NOT NULL,
    "root_proof_size" bigint NOT NULL,
    "total_proof_size" bigint NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."recursive_root_proofs" OWNER TO "postgres";


ALTER TABLE "public"."recursive_root_proofs" ALTER COLUMN "root_proof_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."recursive_root_proofs_root_proof_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "team_id" integer NOT NULL,
    "team_name" "text" NOT NULL,
    "user_id" "uuid",
    "github_org" "text",
    "logo_url" "text",
    "twitter_handle" "text",
    "website_url" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


ALTER TABLE "public"."teams" ALTER COLUMN "team_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."teams_team_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."api_auth_tokens"
    ADD CONSTRAINT "api_auth_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_auth_tokens"
    ADD CONSTRAINT "api_auth_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."aws_instance_pricing"
    ADD CONSTRAINT "aws_instance_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_pkey" PRIMARY KEY ("block_number");



ALTER TABLE ONLY "public"."cluster_configurations"
    ADD CONSTRAINT "cluster_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proofs"
    ADD CONSTRAINT "proofs_pkey" PRIMARY KEY ("proof_id");



ALTER TABLE ONLY "public"."clusters"
    ADD CONSTRAINT "clusters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recursive_root_proofs"
    ADD CONSTRAINT "recursive_root_proofs_pkey" PRIMARY KEY ("root_proof_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("team_id");



ALTER TABLE ONLY "public"."proofs"
    ADD CONSTRAINT "unique_block_cluster" UNIQUE ("block_number", "cluster_id");



CREATE OR REPLACE VIEW "public"."teams_summary" AS
 SELECT "t"."team_id",
    "t"."team_name",
    "t"."logo_url",
    "avg"("p"."proving_cost") AS "average_proving_cost",
    "avg"("p"."proof_latency") AS "average_proof_latency"
   FROM ("public"."teams" "t"
     LEFT JOIN "public"."proofs" "p" ON (("t"."user_id" = "p"."user_id")))
  WHERE (("p"."proof_status" = 'proved'::"text") AND ("p"."proved_timestamp" >= ("now"() - '30 days'::interval)))
  GROUP BY "t"."team_id";


ALTER TABLE "public"."teams_summary" OWNER TO "postgres";


CREATE OR REPLACE TRIGGER "set_cluster_id" BEFORE INSERT ON "public"."clusters" FOR EACH ROW EXECUTE FUNCTION "public"."generate_cluster_id"();



ALTER TABLE ONLY "public"."api_auth_tokens"
    ADD CONSTRAINT "api_auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cluster_configurations"
    ADD CONSTRAINT "cluster_configurations_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id");



ALTER TABLE ONLY "public"."cluster_configurations"
    ADD CONSTRAINT "cluster_configurations_instance_type_id_fkey" FOREIGN KEY ("instance_type_id") REFERENCES "public"."aws_instance_pricing"("id");



ALTER TABLE ONLY "public"."proofs"
    ADD CONSTRAINT "proofs_block_number_fkey" FOREIGN KEY ("block_number") REFERENCES "public"."blocks"("block_number");



ALTER TABLE ONLY "public"."proofs"
    ADD CONSTRAINT "proofs_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id");



ALTER TABLE ONLY "public"."proofs"
    ADD CONSTRAINT "proofs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clusters"
    ADD CONSTRAINT "clusters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recursive_root_proofs"
    ADD CONSTRAINT "recursive_root_proofs_block_number_fkey" FOREIGN KEY ("block_number") REFERENCES "public"."blocks"("block_number");



ALTER TABLE ONLY "public"."recursive_root_proofs"
    ADD CONSTRAINT "recursive_root_proofs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Allow users to see API token entries they own" ON "public"."api_auth_tokens" FOR SELECT TO "anon" USING ("public"."is_allowed_apikey"((("current_setting"('request.headers'::"text", true))::"json" ->> 'ethkey'::"text"), '{all,read}'::"public"."key_mode"[]));



CREATE POLICY "Enable insert for users with an api key" ON "public"."blocks" FOR INSERT WITH CHECK ("public"."is_allowed_apikey"((("current_setting"('request.headers'::"text", true))::"json" ->> 'ethkey'::"text"), '{all,write}'::"public"."key_mode"[]));



CREATE POLICY "Enable insert for users with an api key" ON "public"."clusters" FOR INSERT WITH CHECK ("public"."is_allowed_apikey"((("current_setting"('request.headers'::"text", true))::"json" ->> 'ethkey'::"text"), '{all,write}'::"public"."key_mode"[]));



CREATE POLICY "Enable insert for users with an api key" ON "public"."cluster_configurations" FOR INSERT WITH CHECK ("public"."is_allowed_apikey"((("current_setting"('request.headers'::"text", true))::"json" ->> 'ethkey'::"text"), '{all,write}'::"public"."key_mode"[]));



CREATE POLICY "Enable insert for users with an api key" ON "public"."proofs" FOR INSERT WITH CHECK ("public"."is_allowed_apikey"((("current_setting"('request.headers'::"text", true))::"json" ->> 'ethkey'::"text"), '{all,write}'::"public"."key_mode"[]));



CREATE POLICY "Enable read access for all users" ON "public"."blocks" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."clusters" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."proofs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."recursive_root_proofs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."aws_instance_pricing" FOR SELECT USING (true);



CREATE POLICY "Enable updates for users with an api key" ON "public"."proofs" FOR UPDATE USING ("public"."is_allowed_apikey"((("current_setting"('request.headers'::"text", true))::"json" ->> 'ethkey'::"text"), '{all,write}'::"public"."key_mode"[]));



ALTER TABLE "public"."api_auth_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aws_instance_pricing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cluster_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clusters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proofs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recursive_root_proofs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_cluster_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_cluster_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_cluster_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_allowed_apikey"("apikey" "text", "keymode" "public"."key_mode"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."is_allowed_apikey"("apikey" "text", "keymode" "public"."key_mode"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_allowed_apikey"("apikey" "text", "keymode" "public"."key_mode"[]) TO "service_role";

GRANT ALL ON TABLE "public"."api_auth_tokens" TO "anon";
GRANT ALL ON TABLE "public"."api_auth_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."api_auth_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."aws_instance_pricing" TO "anon";
GRANT ALL ON TABLE "public"."aws_instance_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."aws_instance_pricing" TO "service_role";



GRANT ALL ON SEQUENCE "public"."aws_instance_pricing_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."aws_instance_pricing_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."aws_instance_pricing_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."blocks" TO "anon";
GRANT ALL ON TABLE "public"."blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."blocks" TO "service_role";



GRANT ALL ON TABLE "public"."cluster_configurations" TO "anon";
GRANT ALL ON TABLE "public"."cluster_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."cluster_configurations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cluster_configurations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cluster_configurations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cluster_configurations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clusters" TO "anon";
GRANT ALL ON TABLE "public"."clusters" TO "authenticated";
GRANT ALL ON TABLE "public"."clusters" TO "service_role";



GRANT ALL ON TABLE "public"."proofs" TO "anon";
GRANT ALL ON TABLE "public"."proofs" TO "authenticated";
GRANT ALL ON TABLE "public"."proofs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."proofs_proof_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."proofs_proof_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."proofs_proof_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."recent_summary" TO "anon";
GRANT ALL ON TABLE "public"."recent_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."recent_summary" TO "service_role";



GRANT ALL ON TABLE "public"."recursive_root_proofs" TO "anon";
GRANT ALL ON TABLE "public"."recursive_root_proofs" TO "authenticated";
GRANT ALL ON TABLE "public"."recursive_root_proofs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recursive_root_proofs_root_proof_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recursive_root_proofs_root_proof_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recursive_root_proofs_root_proof_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."teams_summary" TO "anon";
GRANT ALL ON TABLE "public"."teams_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."teams_summary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_team_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_team_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_team_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
RESET ALL;
