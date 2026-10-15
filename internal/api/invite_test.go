package api

import "testing"

func TestCheckInviteCode(t *testing.T) {
	cases := []struct {
		name     string
		env      string
		provided string
		want     error
	}{
		{"unset env rejects everything", "", "anything", errRegistrationDisabled},
		{"unset env rejects empty code", "", "", errRegistrationDisabled},
		{"whitespace-only env counts as unset", "   ", "", errRegistrationDisabled},
		{"wrong code", "secret-code", "random", errInvalidInviteCode},
		{"empty code", "secret-code", "", errInvalidInviteCode},
		{"correct code", "secret-code", "secret-code", nil},
		{"correct code with surrounding whitespace", "secret-code", "  secret-code ", nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("INVITE_CODE", tc.env)
			if got := checkInviteCode(tc.provided); got != tc.want {
				t.Fatalf("checkInviteCode(%q) with INVITE_CODE=%q = %v, want %v", tc.provided, tc.env, got, tc.want)
			}
		})
	}
}
