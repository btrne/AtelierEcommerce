-- ============================================================
-- Seed Admin User + Roles (idempotent)
-- Mật khẩu mặc định: admin123 (SHA256)
-- SHA256('admin123') = 240BE518FABD2724DDB6F04EEB1DA5967448D7E831C08C8FA822809F74C720A9
-- ============================================================

-- 1. Roles
IF NOT EXISTS (SELECT 1 FROM Roles WHERE Id = 1)
    INSERT INTO Roles (Id, Code, Name, IsActive) VALUES (1, 'Admin', 'Quản trị viên', 1);
IF NOT EXISTS (SELECT 1 FROM Roles WHERE Id = 2)
    INSERT INTO Roles (Id, Code, Name, IsActive) VALUES (2, 'Customer', 'Khách hàng', 1);

-- 2. Admin user (email: admin@atelier.com, password: admin123)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@atelier.com')
    INSERT INTO Users (Email, PasswordHash, FullName, Phone, IsActive, CreatedAt)
    VALUES (
        'admin@atelier.com',
        '240BE518FABD2724DDB6F04EEB1DA5967448D7E831C08C8FA822809F74C720A9',
        'Admin Atelier',
        '0900000000',
        1,
        GETUTCDATE()
    );

-- 3. UserRole assignment (Admin role for admin user)
DECLARE @adminUserId INT = (SELECT Id FROM Users WHERE Email = 'admin@atelier.com');
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @adminUserId AND RoleId = 1)
    INSERT INTO UserRoles (UserId, RoleId) VALUES (@adminUserId, 1);

PRINT 'Seed completed: Admin user created/verified.';
