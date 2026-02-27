package control

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	githubReleasesURL = "https://api.github.com/repos/trustpoker/bull-borad/releases/latest"
	updateCacheTTL    = 10 * time.Minute
)

var (
	updateCache struct {
		mu    sync.Mutex
		data  *githubReleaseResponse
		err   error
		until time.Time
	}
)

type githubReleaseResponse struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	PublishedAt string `json:"published_at"`
	HTMLURL     string `json:"html_url"`
	Body        string `json:"body"`
	Assets      []struct {
		Name        string `json:"name"`
		Size        int64  `json:"size"`
		DownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

func (s *Server) systemVersion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/api/system/version" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	prefix := s.cfg.Prefix
	if prefix == "" {
		prefix = "/opt/bull-board"
	}
	versionPath := filepath.Join(prefix, "current", "VERSION")
	currentVersion := Version
	if data, err := os.ReadFile(versionPath); err == nil {
		currentVersion = strings.TrimSpace(string(data))
	}
	out := map[string]any{"current_version": currentVersion}
	writeJSON(w, out)
}

func (s *Server) systemUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/api/system/update" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	prefix := s.cfg.Prefix
	if prefix == "" {
		prefix = "/opt/bull-board"
	}
	versionPath := filepath.Join(prefix, "current", "VERSION")
	currentVersion := Version
	if data, err := os.ReadFile(versionPath); err == nil {
		currentVersion = strings.TrimSpace(string(data))
	}
	ignored, _ := GetIgnoredVersions(s.db)
	latest, err := fetchLatestRelease()
	hasUpdate := false
	var latestVersion, releaseURL, notesMD, publishedAt string
	var assets []map[string]any
	if err == nil && latest != nil {
		latestVersion = strings.TrimPrefix(latest.TagName, "v")
		if latest.TagName != "" && latestVersion == "" {
			latestVersion = latest.TagName
		}
		releaseURL = latest.HTMLURL
		notesMD = latest.Body
		publishedAt = latest.PublishedAt
		for _, a := range latest.Assets {
			assets = append(assets, map[string]any{
				"name":         a.Name,
				"size":         a.Size,
				"download_url": a.DownloadURL,
			})
		}
		if latestVersion != "" && !contains(ignored, latestVersion) && !contains(ignored, latest.TagName) {
			if compareVersions(latestVersion, currentVersion) > 0 {
				hasUpdate = true
			}
		}
	}
	latestMap := map[string]any{"version": latestVersion, "name": "", "published_at": publishedAt, "release_url": releaseURL, "notes_md": notesMD, "assets": assets}
	if latest != nil {
		latestMap["name"] = latest.Name
	}
	out := map[string]any{
		"current_version":   currentVersion,
		"has_update":        hasUpdate,
		"ignored_versions":  ignored,
		"latest":            latestMap,
	}
	if err != nil {
		out["error"] = err.Error()
	}
	writeJSON(w, out)
}

func (s *Server) systemUpdateIgnore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/system/update/ignore" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	var body struct {
		Version string `json:"version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Version == "" {
		writeJSONError(w, "version required", http.StatusBadRequest)
		return
	}
	ignored, err := GetIgnoredVersions(s.db)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	v := strings.TrimPrefix(body.Version, "v")
	if !contains(ignored, v) {
		ignored = append(ignored, v)
		if err := SetIgnoredVersions(s.db, ignored); err != nil {
			writeJSONError(w, "db", http.StatusInternalServerError)
			return
		}
	}
	writeJSON(w, map[string]any{"ok": true, "ignored_versions": ignored})
}

func (s *Server) systemUpgradePlan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/system/upgrade/plan" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	var body struct {
		Version string `json:"version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Version == "" {
		writeJSONError(w, "version required", http.StatusBadRequest)
		return
	}
	version := strings.TrimSpace(body.Version)
	command := "curl -fsSL https://raw.githubusercontent.com/trustpoker/bull-borad/main/infra/deploy/install.sh | bash -s -- upgrade --version " + version
	writeJSON(w, map[string]any{"mode": "manual", "command": command})
}

func fetchLatestRelease() (*githubReleaseResponse, error) {
	updateCache.mu.Lock()
	defer updateCache.mu.Unlock()
	if time.Now().Before(updateCache.until) {
		return updateCache.data, updateCache.err
	}
	req, _ := http.NewRequest(http.MethodGet, githubReleasesURL, nil)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		updateCache.data = nil
		updateCache.err = err
		updateCache.until = time.Now().Add(updateCacheTTL)
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		updateCache.data = nil
		updateCache.err = fmt.Errorf("github api status %d", resp.StatusCode)
		updateCache.until = time.Now().Add(updateCacheTTL)
		return nil, updateCache.err
	}
	var data githubReleaseResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		updateCache.data = nil
		updateCache.err = err
		updateCache.until = time.Now().Add(updateCacheTTL)
		return nil, err
	}
	updateCache.data = &data
	updateCache.err = nil
	updateCache.until = time.Now().Add(updateCacheTTL)
	return &data, nil
}

func contains(ss []string, s string) bool {
	for _, v := range ss {
		if v == s {
			return true
		}
	}
	return false
}

// compareVersions 语义化版本比较：a > b 返回 1，a < b 返回 -1，相等 0
func compareVersions(a, b string) int {
	a = strings.TrimPrefix(a, "v")
	b = strings.TrimPrefix(b, "v")
	pa := parseVersionParts(a)
	pb := parseVersionParts(b)
	for i := 0; i < len(pa) || i < len(pb); i++ {
		var na, nb int
		if i < len(pa) {
			na = pa[i]
		}
		if i < len(pb) {
			nb = pb[i]
		}
		if na > nb {
			return 1
		}
		if na < nb {
			return -1
		}
	}
	return 0
}

func parseVersionParts(s string) []int {
	var parts []int
	for _, p := range strings.Split(s, ".") {
		n := 0
		for _, c := range p {
			if c >= '0' && c <= '9' {
				n = n*10 + int(c-'0')
			} else {
				break
			}
		}
		parts = append(parts, n)
	}
	return parts
}
