create table if not exists admin (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  email text unique not null,
  setor text,
  secao text,
  cargo text,
  ativo boolean default true
);
