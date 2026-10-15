package secrets

import (
	"encoding/base64"
	"errors"
	"strings"
	"testing"
)

const (
	testKeyB64 = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
	testKeyHex = "3031323334353637383961626364656630313233343536373839616263646566"
	otherKey   = "ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA="
)

func withKey(t *testing.T, key string) {
	t.Helper()
	if err := useKey(key); err != nil {
		t.Fatalf("useKey: %v", err)
	}
	t.Cleanup(func() { _ = useKey("") })
}

func TestRoundTrip(t *testing.T) {
	withKey(t, testKeyB64)
	for _, plain := range []string{"", "postgres://u:p@host/db", "ünïcødé 🔐", strings.Repeat("x", 10000), Prefix + "looks-encrypted"} {
		enc, err := Encrypt(plain)
		if err != nil {
			t.Fatal(err)
		}
		if !IsEncrypted(enc) {
			t.Fatalf("expected prefix on %q", enc)
		}
		if plain != "" && strings.Contains(enc, plain) {
			t.Fatal("ciphertext leaks plaintext")
		}
		got, err := Decrypt(enc)
		if err != nil {
			t.Fatal(err)
		}
		if got != plain {
			t.Fatalf("round trip: got %q want %q", got, plain)
		}
	}
}

func TestNonceIsRandom(t *testing.T) {
	withKey(t, testKeyB64)
	a, _ := Encrypt("same")
	b, _ := Encrypt("same")
	if a == b {
		t.Fatal("encrypting the same value twice should differ")
	}
}

func TestHexAndBase64KeysAreEquivalent(t *testing.T) {
	withKey(t, testKeyHex)
	enc, err := Encrypt("value")
	if err != nil {
		t.Fatal(err)
	}
	withKey(t, testKeyB64)
	if got, err := Decrypt(enc); err != nil || got != "value" {
		t.Fatalf("got %q, %v", got, err)
	}
}

func TestWrongKeyFails(t *testing.T) {
	withKey(t, testKeyB64)
	enc, _ := Encrypt("value")
	withKey(t, otherKey)
	if _, err := Decrypt(enc); err == nil {
		t.Fatal("expected decrypt with wrong key to fail")
	}
}

func TestTamperedCiphertextFails(t *testing.T) {
	withKey(t, testKeyB64)
	enc, _ := Encrypt("value")
	raw, _ := base64.StdEncoding.DecodeString(strings.TrimPrefix(enc, Prefix))
	raw[len(raw)-1] ^= 0xff
	if _, err := Decrypt(Prefix + base64.StdEncoding.EncodeToString(raw)); err == nil {
		t.Fatal("expected tampered ciphertext to fail")
	}
}

func TestWithoutKey(t *testing.T) {
	withKey(t, "")
	if Enabled() {
		t.Fatal("expected disabled without key")
	}
	if got, err := Encrypt("plain"); err != nil || got != "plain" {
		t.Fatalf("without a key values stay plaintext: %q, %v", got, err)
	}
	if got, err := Decrypt("legacy-plain"); err != nil || got != "legacy-plain" {
		t.Fatalf("plaintext should pass through: %q, %v", got, err)
	}
	if _, err := Decrypt(Prefix + "AAAA"); !errors.Is(err, ErrNoKey) {
		t.Fatalf("expected ErrNoKey, got %v", err)
	}
}

func TestInvalidKeyRejected(t *testing.T) {
	t.Cleanup(func() { _ = useKey("") })
	for _, k := range []string{"short", base64.StdEncoding.EncodeToString([]byte("sixteen-byte-key")), "zz" + testKeyHex[2:]} {
		if err := useKey(k); !errors.Is(err, ErrInvalidKey) {
			t.Fatalf("key %q: expected ErrInvalidKey, got %v", k, err)
		}
		if _, err := Encrypt("x"); err == nil {
			t.Fatalf("key %q: encrypt should fail with an invalid key", k)
		}
	}
}
