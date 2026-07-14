package models

import (
	"time"
)

type User struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	GithubID  string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	Email     string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	AvatarURL string    `gorm:"type:text"`
	CreatedAt time.Time `gorm:"autoCreateTime"`

	Projects []Project `gorm:"constraint:OnDelete:CASCADE;"`
}

type Project struct {
	ID                 string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID             string    `gorm:"type:uuid;not null;uniqueIndex:idx_user_project"`
	Name               string    `gorm:"type:varchar(255);not null;uniqueIndex:idx_user_project"`
	RepositoryURL      string    `gorm:"type:text;not null"`
	Framework          string    `gorm:"type:varchar(50)"`
	BuildCommand       string    `gorm:"type:varchar(255)"`
	RunCommand         string    `gorm:"type:varchar(255)"`
	Status             string    `gorm:"type:varchar(50);default:'cloning'"`
	ProductionURL      string    `gorm:"type:text"`
	CreatedAt          time.Time `gorm:"autoCreateTime"`
	ActiveDeploymentID *string   `gorm:"type:uuid"`

	Deployments []Deployment `gorm:"constraint:OnDelete:CASCADE;"`
}

type Deployment struct {
	ID            string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ProjectID     string `gorm:"type:uuid;not null"`
	CommitSHA     string `gorm:"type:varchar(40);not null"`
	CommitMessage string `gorm:"type:text"`
	Status        string `gorm:"type:varchar(50);default:'pending';not null"`
	ContainerID   string `gorm:"type:varchar(255)"`
	InternalPort  int
	BuildLogs     string    `gorm:"type:text"`
	CreatedAt     time.Time `gorm:"autoCreateTime"`
	FinishedAt    *time.Time
}
