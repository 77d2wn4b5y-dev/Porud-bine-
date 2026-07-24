# Changelog

## 2.7.0 Stable — 2026-07-24

### Ispravljeno

- Rezervna JSON kopija sada obuhvata podatke svih poslovnih modula, podešavanja izgleda i nedovršenu porudžbinu, uz izuzimanje bezbednosnih i cloud podataka vezanih za uređaj.
- Vraćanje podataka prihvata novi kompletni format i postojeće rezervne kopije koje sadrže samo osnovno stanje aplikacije.
- Preimenovanje kupca iz kartice kupca sada ažurira istoriju porudžbina i sve rute, uključujući promenu samo velikih/malih slova.
- Brisanje kupca iz kartice pouzdano uklanja reference iz ruta, bez brisanja istorije porudžbina.
- Dashboard se automatski osvežava posle svake promene osnovnih podataka, uključujući brisanje porudžbine.
- Normalizacija učitanih podataka bezbedno obrađuje oštećene ili nepotpune zapise bez promene važećeg formata podataka.
- Service Worker koristi novi cache za verziju 2.7.0 i čeka završetak ažuriranja cache-a radi pouzdanijeg offline rada.

### Kompatibilnost

- Ključevi `porudzbine-app-v1` i `porudzbine-app-v2` ostaju podržani.
- Postojeći localStorage format nije promenjen.
- Stari JSON backup fajlovi ostaju podržani pri vraćanju.
