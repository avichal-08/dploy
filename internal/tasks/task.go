package tasks

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

const (
	TypeDeployApp = "pipeline:deploy"
)

type DeployPayload struct {
	ProjectID    string `json:"project_id"`
	DeploymentID string `json:"deployment_id"`
}

func NewDeployTask(projectID, deploymentID string) (*asynq.Task, error) {
	payload, err := json.Marshal(DeployPayload{ProjectID: projectID, DeploymentID: deploymentID})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeDeployApp, payload), nil
}
