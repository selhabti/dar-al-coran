-- 0003 : adultes, coordonnees, horaire recurrent du groupe, fin de seance (verset)

-- Coordonnees des eleves
alter table students add column if not exists city text;
alter table students add column if not exists email text;
alter table students add column if not exists phone text;

-- Horaire recurrent du groupe (0 = dimanche .. 6 = samedi, convention extract(dow))
alter table cohorts add column if not exists weekday smallint check (weekday between 0 and 6);
alter table cohorts add column if not exists start_time time;
alter table cohorts add column if not exists end_time time;
alter table cohorts add column if not exists timezone text not null default 'Europe/Paris';

-- Fin de seance : heure de fin + dernier verset etudie
alter table sessions add column if not exists ends_at timestamptz;
alter table sessions add column if not exists last_surah text;
alter table sessions add column if not exists last_ayah integer;

-- Retire l'ancienne contrainte AVANT de migrer les valeurs
alter table session_entries drop constraint if exists session_entries_attendance_check;

-- Migration des anciens statuts vers les nouveaux
update session_entries set attendance = 'absent_non_justifie' where attendance = 'absent';
update session_entries set attendance = 'inconnu' where attendance = 'exempt';

-- Nouveaux statuts : present / retard / absent_justifie / absent_non_justifie / inconnu
alter table session_entries add constraint session_entries_attendance_check
  check (attendance in ('present', 'retard', 'absent_justifie', 'absent_non_justifie', 'inconnu'));
