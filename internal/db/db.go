package db

import (
	"log"
	"log/slog"

	"github.com/avichal-08/dploy/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init(dsn string) {
	var err error

	DB, err = gorm.Open(postgres.Open(dsn))

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	slog.Info("migrating database schema...")
	err = DB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Deployment{},
	)

	if err != nil {
		slog.Error("Failed to migrate database", "error", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		slog.Error("failed to get sql.DB", "error", err)
	}

	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(10)

	slog.Info("Database connected and migrated successfully!")
}
