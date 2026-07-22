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
	TargetConcurrency  *int      `gorm:"type:integer"`
	CreatedAt          time.Time `gorm:"autoCreateTime"`
	ActiveDeploymentID *string   `gorm:"type:uuid"`

	Envs        []ProjectEnv `gorm:"constraint:OnDelete:CASCADE;"`
	Deployments []Deployment `gorm:"constraint:OnDelete:CASCADE;"`
}

type ProjectEnv struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ProjectID string    `gorm:"type:uuid;not null;index"`
	Key       string    `gorm:"not null;type:varchar(255)"`
	Value     string    `gorm:"not null;type:text"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
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

type Replica struct {
	ID           string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ProjectID    string    `gorm:"type:uuid;not null"`
	DeploymentID string    `gorm:"type:uuid;not null"`
	ContainerID  string    `gorm:"type:varchar(255);uniqueIndex"`
	Status       string    `gorm:"type:varchar(50);default:'starting'"`
	InternalPort int       `gorm:"type:int"`
	RestartCount int       `gorm:"type:int;default:0"`
	LastCrashAt  time.Time `gorm:"type:timestamp"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}
