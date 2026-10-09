# SelfBurnOut

A focused Pomodoro timer with a GitHub-style yearly progress calendar, accounts, and switchable colour themes. Built with ASP.NET Core MVC and PostgreSQL.

<!-- Add a screenshot or GIF here once you have one:
![SelfBurnOut](docs/screenshot.png)
-->

## Features

- **Pomodoro timer**: Focus, Short break and Long break modes with a circular progress ring. Every 4th focus session is followed by a long break. Durations are adjustable.
- **Full-screen focus view**: expand the timer to fill the screen so you can read or work without distractions. The timer keeps running.
- **Progress calendar**: a 12-month grid of dots, one per day, that get darker the more pomodoros you finish. Hover a day to see the number of pomodoros and total minutes. Tiles show today's count, your day streak and your yearly total.
- **Themes**: Light, Black, Green, Red, Yellow, Orange and Purple. The choice applies everywhere and is remembered.
- **Accounts**: register, log in, log out and change your password (ASP.NET Core Identity, stored in PostgreSQL).
- **Keyboard shortcuts**: `Space` start/pause, `R` reset, `F` full screen, `Esc` exit full screen.

## Tech stack

| Area | Technology |
|---|---|
| Framework | ASP.NET Core MVC (.NET 10) |
| Auth | ASP.NET Core Identity |
| Database | PostgreSQL via Entity Framework Core and Npgsql |
| Front end | Razor views, Bootstrap 5, vanilla JavaScript, CSS variables for theming |

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- A PostgreSQL database (local or hosted)
- The EF Core CLI: `dotnet tool install -g dotnet-ef`

### Setup

```bash
git clone <your-repo-url>
cd SelfBurnOut/SelfBurnOut
```

Store your connection string in [user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) so the password never lands in source control:

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=selfburnout;Username=postgres;Password=YOUR_PASSWORD"
```

For a hosted database you will usually need to add `SSL Mode=Require` to the connection string.

Create the database tables and run the app:

```bash
dotnet ef database update
dotnet run
```

Then open the URL shown in the console, register an account and start a session.

### Run with Docker

The repo includes a `Dockerfile` and a `docker-compose.yml` that start the app together with PostgreSQL:

```bash
cp .env.example .env     # then set a strong POSTGRES_PASSWORD
docker compose up -d --build
```

Open http://localhost:8080. Database tables are created automatically on startup, and the data lives in the `pgdata` volume. Stop with `docker compose down` (add `-v` to also delete the data).

The container serves plain HTTP on port 8080, so put a reverse proxy (Caddy, nginx, Traefik) in front of it for HTTPS.

### Deployment

Provide the connection string through the environment variable `ConnectionStrings__DefaultConnection` instead of user secrets. Set `Database__MigrateOnStartup=true` to apply migrations automatically.

## Project structure

```
SelfBurnOut/
├── Controllers/     Account (auth), Pomodoro, Error
├── Data/            AppDbContext (Identity + EF Core)
├── Migrations/      EF Core migrations
├── Models/          View models
├── Views/           Razor views and shared layout
└── wwwroot/
    ├── css/site.css       Theme tokens and styles
    └── js/
        ├── pomodoro.js    Timer, full-screen view, calendar
        └── theme.js       Theme switching
```

## Current limitations and roadmap

- [x] Accounts and themes
- [x] Timer, full-screen mode and yearly calendar
- [ ] Save pomodoro history to the database per user. It is currently kept in the browser's local storage, so it does not follow you across devices.
- [ ] Save the chosen theme and durations to the user's account

## Contributing

Issues and pull requests are welcome.
