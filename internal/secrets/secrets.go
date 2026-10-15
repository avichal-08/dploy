package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
)

const Prefix = "enc:v1:"

var (
	ErrNoKey      = errors.New("ENV_ENCRYPTION_KEY is not set, cannot decrypt stored secret")
	ErrInvalidKey = errors.New("ENV_ENCRYPTION_KEY must be 32 bytes encoded as base64 or 64 hex characters")
)

var (
	mu      sync.RWMutex
	loaded  bool
	aead    cipher.AEAD
	loadErr error
)

func parseKey(raw string) ([]byte, error) {
	raw = strings.TrimSpace(raw)
	if b, err := hex.DecodeString(raw); err == nil && len(b) == 32 {
		return b, nil
	}
	for _, enc := range []*base64.Encoding{base64.StdEncoding, base64.RawStdEncoding, base64.URLEncoding, base64.RawURLEncoding} {
		if b, err := enc.DecodeString(raw); err == nil && len(b) == 32 {
			return b, nil
		}
	}
	return nil, ErrInvalidKey
}

func useKey(raw string) error {
	mu.Lock()
	defer mu.Unlock()
	loaded = true
	aead, loadErr = nil, nil
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	key, err := parseKey(raw)
	if err != nil {
		loadErr = err
		return err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		loadErr = err
		return err
	}
	aead, loadErr = cipher.NewGCM(block)
	return loadErr
}

func current() (cipher.AEAD, error) {
	mu.RLock()
	if loaded {
		defer mu.RUnlock()
		return aead, loadErr
	}
	mu.RUnlock()
	_ = useKey(os.Getenv("ENV_ENCRYPTION_KEY"))
	mu.RLock()
	defer mu.RUnlock()
	return aead, loadErr
}

func Init() error {
	return useKey(os.Getenv("ENV_ENCRYPTION_KEY"))
}

func Enabled() bool {
	a, err := current()
	return err == nil && a != nil
}

func IsEncrypted(value string) bool {
	return strings.HasPrefix(value, Prefix)
}

func Encrypt(plain string) (string, error) {
	a, err := current()
	if err != nil {
		return "", err
	}
	if a == nil {
		return plain, nil
	}
	nonce := make([]byte, a.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	sealed := a.Seal(nonce, nonce, []byte(plain), nil)
	return Prefix + base64.StdEncoding.EncodeToString(sealed), nil
}

func Decrypt(stored string) (string, error) {
	if !IsEncrypted(stored) {
		return stored, nil
	}
	a, err := current()
	if err != nil {
		return "", err
	}
	if a == nil {
		return "", ErrNoKey
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, Prefix))
	if err != nil {
		return "", fmt.Errorf("decode secret: %w", err)
	}
	if len(raw) < a.NonceSize() {
		return "", errors.New("decode secret: ciphertext too short")
	}
	plain, err := a.Open(nil, raw[:a.NonceSize()], raw[a.NonceSize():], nil)
	if err != nil {
		return "", fmt.Errorf("decrypt secret: %w", err)
	}
	return string(plain), nil
}
