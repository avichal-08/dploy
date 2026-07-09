package db

import (
	"database/sql"
	"embed"
	"errors"
	"log/slog"
	"os"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

//go:embed migrations/*.sql
var migrationFS embed.FS
var DB *gorm.DB

func Init(dsn string) {
	var err error
	var sqlDB *sql.DB

	//retry Loop (for neon cold starts)
	for i := 0; i < 10; i++ {
		DB, err = gorm.Open(postgres.Open(dsn))
		if err == nil {
			sqlDB, err = DB.DB()
			if err == nil {
				err = sqlDB.Ping()
				if err == nil {
					slog.Info("connected to PostgreSQL", "attempt", i+1)
					break
				}
			}
		}

		slog.Warn("waiting for database to wake up...", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		slog.Error("failed to connect to database after retries", "error", err)
		os.Exit(1)
	}

	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	runMigrations(dsn)
}

func runMigrations(dsn string) {
	slog.Info("checking database migrations...")

	d, err := iofs.New(migrationFS, "migrations")
	if err != nil {
		slog.Error("failed to load embedded migrations", "error", err)
		os.Exit(1)
	}

	m, err := migrate.NewWithSourceInstance("iofs", d, dsn)
	if err != nil {
		slog.Error("failed to create migrate instance", "error", err)
		os.Exit(1)
	}

	err = m.Up()

	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		slog.Error("failed to apply migrations", "error", err)
		os.Exit(1)
	}

	if errors.Is(err, migrate.ErrNoChange) {
		slog.Info("database schema is already up to date")
	} else {
		slog.Info("database schema updated successfully")
	}
}
