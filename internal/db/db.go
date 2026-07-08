package db

import (
	"fmt"
	"log"

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

	fmt.Println("Migrating database schema...")
	err = DB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Deployment{},
	)

	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("failed to get sql.DB: %v", err)
	}

	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(10)

	fmt.Println("Database connected and migrated successfully!")
}
