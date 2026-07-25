import React, { useState, useEffect } from "react";
import { fetchAllUsers, updateUserRole, deleteUser } from "../api.js";

export default function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      const data = await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u))
      );
      alert(`Role updated to ${newRole}`);
    } catch {
      // Error handled by interceptor
    }
  };

  const handleDelete = async (userId, name) => {
    if (userId === currentUser?.id) {
      return alert("You cannot delete your own account");
    }
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      alert("User deleted");
    } catch {
      // Error handled by interceptor
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return <div className="admin-loading">Loading users...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-top-bar">
        <div>
          <h1>Users</h1>
          <p>{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="admin-name-cell-flex">
                  <div className="admin-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                  {u.name}
                  {u.id === currentUser?.id && <span className="admin-you-tag">You</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={u.role === "admin" ? "admin-role-admin" : "admin-role-user"}>
                    {u.role}
                  </span>
                </td>
                <td>{formatDate(u.createdAt)}</td>
                <td className="admin-table-actions">
                  <button
                    className="admin-toggle-btn"
                    onClick={() => handleToggleRole(u.id, u.role)}
                    disabled={u.id === currentUser?.id}
                  >
                    {u.role === "admin" ? "Make User" : "Make Admin"}
                  </button>
                  <button
                    className="admin-delete-btn"
                    onClick={() => handleDelete(u.id, u.name)}
                    disabled={u.id === currentUser?.id}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="5" className="admin-empty-row">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {users.length === 1 && users[0].id === currentUser?.id && (
        <p className="admin-users-note">
          This is your only account. Create another account through Sign Up to manage its role or delete it here.
        </p>
      )}
    </div>
  );
}
