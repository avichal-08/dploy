package proxy

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

var s3Client *s3.Client

func InitS3Client(client *s3.Client) {
	s3Client = client
}

func handleStaticS3Proxy(w http.ResponseWriter, r *http.Request, storagePrefix string) {
	if s3Client == nil {
		slog.Error("S3 client not initialized")
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	requestedFile := r.URL.Path
	if requestedFile == "/" {
		requestedFile = "/index.html"
	}

	s3Key := filepath.Join(storagePrefix, requestedFile)

	err := streamFromS3(w, s3Key)

	if err != nil && isNoSuchKeyError(err) {
		fallbackKey := filepath.Join(storagePrefix, "index.html")
		err = streamFromS3(w, fallbackKey)
	}

	if err != nil {
		slog.Error("S3 proxy error", "key", s3Key, "error", err)
		http.Error(w, "Not Found", http.StatusNotFound)
	}
}

func streamFromS3(w http.ResponseWriter, key string) error {
	out, err := s3Client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String("dploy-deployments"),
		Key:    aws.String(key),
	})
	if err != nil {
		return err
	}
	defer out.Body.Close()

	ext := filepath.Ext(key)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)

	_, err = io.Copy(w, out.Body)
	return err
}

func isNoSuchKeyError(err error) bool {
	var noSuchKey *types.NoSuchKey
	return errors.As(err, &noSuchKey)
}
