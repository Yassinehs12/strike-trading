-- Trade psychology tagging: what emotion drove the trade, and how clean the setup was.
alter table public.trades add column if not exists emotion text
  check (emotion in ('Neutral', 'Greed', 'FOMO', 'Overtrading', 'Fear')) default 'Neutral';

alter table public.trades add column if not exists setup_grade text
  check (setup_grade in ('A+', 'A', 'B')) default 'A';
