# EduWants Backend - SQLite Conversion Plan

## Overview
Convert the EduWants backend from PostgreSQL to SQLite and remove Docker dependencies.

## Tasks

### Step 1: Update config/settings.py
- [x] Change database from PostgreSQL to SQLite
- [x] Simplify DATABASES configuration

### Step 2: Update users/models.py
- [x] Replace ArrayField with JSONField for interested_subjects
- [x] Replace ArrayField with JSONField for goals in AcademicProfile

### Step 3: Update academic/models.py
- [x] Replace ArrayField with JSONField for tags in Note model

### Step 4: Create requirements.txt
- [x] Add Django and dependencies (without psycopg2)
- [x] Include only SQLite-compatible packages

### Step 5: Create .env file
- [x] Remove PostgreSQL environment variables
- [x] Add SQLite configuration

### Step 6: Run migrations
- [ ] Generate new migrations
- [ ] Apply to SQLite database

## Completion Status
Plan created - awaiting user approval

