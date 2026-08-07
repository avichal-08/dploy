package pipeline

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"os"
	"path/filepath"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/proxy"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var s3Client *s3.Client

func InitS3Client(client *s3.Client) {
	s3Client = client
}

func RunStaticDeployment(project models.Project, deploymentID string, buildDir string, envs *[]models.ProjectEnv, logWriter io.Writer) error {
	logWriter.Write([]byte("--> Starting Static Site Build phase...\n"))

	outputDirName := project.OutputDir
	if outputDirName == "" {
		outputDirName = "dist"
	}

	buildLogs, err := BuildStaticAssets(buildDir, project.Framework, project.BuildCommand, outputDirName, envs, logWriter)
	if err != nil {
		slog.Error("static asset build failed", "error", err)
		failDeployment(deploymentID, project.ID, buildLogs+"\nBuild failed: "+err.Error())
		return err
	}

	outputFolder := filepath.Join(buildDir, outputDirName)

	if _, err := os.Stat(outputFolder); os.IsNotExist(err) {
		slog.Error("build output directory missing", "dir", outputFolder)
		failDeployment(deploymentID, project.ID, fmt.Sprintf("Build output directory '%s' was not generated", outputDirName))
		return err
	}

	storagePrefix := fmt.Sprintf("projects/%s/%s", project.ID, deploymentID)
	logWriter.Write([]byte(fmt.Sprintf("--> Uploading static assets to Object Storage (%s)...\n", storagePrefix)))

	uploadLogs, err := uploadDirectoryToS3(outputFolder, storagePrefix)
	finalLogs := buildLogs + "\n--- UPLOAD PHASE ---\n" + uploadLogs

	if err != nil {
		slog.Error("s3 asset upload failed", "error", err)
		failDeployment(deploymentID, project.ID, finalLogs+"\nS3 upload failed: "+err.Error())
		return err
	}

	logWriter.Write([]byte("--> Static assets uploaded successfully. Updating proxy routes...\n"))

	db.DB.Model(&models.Project{ID: project.ID}).Updates(map[string]interface{}{
		"status":               "deployed",
		"active_deployment_id": deploymentID,
	})

	db.DB.Model(&models.Deployment{ID: deploymentID}).Updates(map[string]interface{}{
		"status":         "success",
		"storage_prefix": storagePrefix,
		"build_logs":     finalLogs,
		"finished_at":    time.Now(),
	})

	proxy.CacheManager.Invalidate(project.Name)
	proxy.CacheManager.WarmCache(project.Name, deploymentID, "static", storagePrefix, nil)

	slog.Info("static project deployed successfully", "project", project.Name, "prefix", storagePrefix)
	logWriter.Write([]byte("--> Deployment completed successfully!\n"))
	return nil
}

func uploadDirectoryToS3(distDir string, storagePrefix string) (string, error) {
	var logs string

	err := filepath.Walk(distDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}

		relPath, err := filepath.Rel(distDir, path)
		if err != nil {
			return err
		}

		s3Key := filepath.ToSlash(filepath.Join(storagePrefix, relPath))

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		ext := filepath.Ext(path)
		contentType := mime.TypeByExtension(ext)
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		_, uploadErr := s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
			Bucket:      aws.String("dploy-deployments"),
			Key:         aws.String(s3Key),
			Body:        file,
			ContentType: aws.String(contentType),
		})

		if uploadErr != nil {
			return uploadErr
		}

		logs += fmt.Sprintf("Uploaded: %s -> %s\n", relPath, s3Key)
		return nil
	})

	return logs, err
}
