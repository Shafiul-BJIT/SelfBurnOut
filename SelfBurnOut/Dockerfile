FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so this layer is cached until the project file changes.
COPY SelfBurnOut.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Writable location for data-protection keys, owned by the non-root app user.
RUN mkdir /keys && chown $APP_UID /keys
USER $APP_UID

ENV DataProtection__KeysPath=/keys
EXPOSE 8080
ENTRYPOINT ["dotnet", "SelfBurnOut.dll"]
