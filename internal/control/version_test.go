package control

import "testing"

func TestVersionSet(t *testing.T) {
	if Version == "" {
		t.Error("Version should be set")
	}
}
