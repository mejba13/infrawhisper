package auth

import "fmt"

type Role string

const (
	RoleAdmin  Role = "admin"
	RoleEditor Role = "editor"
	RoleViewer Role = "viewer"
)

var roleHierarchy = map[Role]int{
	RoleAdmin:  3,
	RoleEditor: 2,
	RoleViewer: 1,
}

func HasPermission(userRole Role, required Role) bool {
	return roleHierarchy[userRole] >= roleHierarchy[required]
}

func RequireRole(userRole string, required Role) error {
	if !HasPermission(Role(userRole), required) {
		return fmt.Errorf("insufficient permissions: requires %s", required)
	}
	return nil
}
