package db

import (
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/secrets"
)

func EncryptPlaintextEnvs() (int, error) {
	if !secrets.Enabled() {
		return 0, nil
	}
	var envs []models.ProjectEnv
	if err := DB.Where("value NOT LIKE ?", secrets.Prefix+"%").Find(&envs).Error; err != nil {
		return 0, err
	}
	for i := range envs {
		if err := DB.Save(&envs[i]).Error; err != nil {
			return i, err
		}
	}
	return len(envs), nil
}
