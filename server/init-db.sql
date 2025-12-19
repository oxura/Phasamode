-- Database initialization for Phase Messenger
-- Run this: psql -U postgres -f init-db.sql

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE phase_messenger'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'phase_messenger')\gexec

\c phase_messenger

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Then run the schema from init.sql
-- \i init.sql
