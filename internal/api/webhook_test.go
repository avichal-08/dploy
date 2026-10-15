package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func TestValidGitHubSignature(t *testing.T) {
	body := []byte(`{"ref":"refs/heads/main"}`)
	secret := "s3cr3t"

	cases := []struct {
		name   string
		secret string
		header string
		want   bool
	}{
		{"valid", secret, sign(secret, body), true},
		{"wrong secret", secret, sign("other", body), false},
		{"tampered body", secret, sign(secret, []byte(`{"ref":"refs/heads/evil"}`)), false},
		{"missing prefix", secret, sign(secret, body)[len("sha256="):], false},
		{"sha1 header", secret, "sha1=abcdef", false},
		{"not hex", secret, "sha256=zzzz", false},
		{"empty header", secret, "", false},
		{"project without secret", "", sign("", body), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := validGitHubSignature(tc.secret, body, tc.header); got != tc.want {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
		})
	}
}

func TestNormalizeRepoURL(t *testing.T) {
	want := "github.com/acme/storefront"
	for _, in := range []string{
		"https://github.com/acme/storefront",
		"https://github.com/acme/storefront.git",
		"https://github.com/Acme/Storefront/",
		"http://www.github.com/acme/storefront",
		"git@github.com:acme/storefront.git",
		"ssh://git@github.com/acme/storefront.git",
		"https://user:token@github.com/acme/storefront.git",
	} {
		if got := normalizeRepoURL(in); got != want {
			t.Errorf("normalizeRepoURL(%q) = %q, want %q", in, got, want)
		}
	}
}

func pushEvent(ref, defaultBranch string, deleted bool) githubPushEvent {
	var e githubPushEvent
	e.Ref = ref
	e.Deleted = deleted
	e.Repo.HTMLURL = "https://github.com/acme/storefront"
	e.Repo.CloneURL = "https://github.com/acme/storefront.git"
	e.Repo.SSHURL = "git@github.com:acme/storefront.git"
	e.Repo.DefaultBranch = defaultBranch
	return e
}

func TestPushMatchesRepo(t *testing.T) {
	e := pushEvent("refs/heads/main", "main", false)
	if !e.matchesRepo("https://github.com/acme/storefront.git") {
		t.Fatal("expected match for same repo")
	}
	if e.matchesRepo("https://github.com/acme/other") {
		t.Fatal("expected no match for a different repo")
	}
	if e.matchesRepo("https://github.com/acme/storefront-fork") {
		t.Fatal("expected no match for a repo sharing a prefix")
	}
}

func TestPushDeployDecision(t *testing.T) {
	cases := []struct {
		name    string
		event   githubPushEvent
		deploys bool
	}{
		{"push to default branch", pushEvent("refs/heads/main", "main", false), true},
		{"push to master default", pushEvent("refs/heads/master", "master", false), true},
		{"push to feature branch", pushEvent("refs/heads/feature/x", "main", false), false},
		{"tag push", pushEvent("refs/tags/v1.0.0", "main", false), false},
		{"default branch deleted", pushEvent("refs/heads/main", "main", true), false},
		{"missing default branch", pushEvent("refs/heads/main", "", false), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, reason := tc.event.deployDecision()
			if got != tc.deploys {
				t.Fatalf("deploy = %v (%s), want %v", got, reason, tc.deploys)
			}
			if !got && reason == "" {
				t.Fatal("ignored pushes should explain why")
			}
		})
	}
}

func TestNewWebhookSecret(t *testing.T) {
	a, err := newWebhookSecret()
	if err != nil {
		t.Fatal(err)
	}
	b, _ := newWebhookSecret()
	if len(a) != 64 {
		t.Fatalf("expected 64 hex chars, got %d", len(a))
	}
	if a == b {
		t.Fatal("secrets should be random")
	}
}
