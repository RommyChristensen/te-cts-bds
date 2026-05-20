-- Seed initial users data
INSERT INTO users (username, nama, tim, eliminated) VALUES
    ('player001', 'John Doe', 'Team Alpha', false),
    ('player002', 'Jane Smith', 'Team Beta', false),
    ('player003', 'Mike Johnson', 'Team Alpha', false),
    ('player004', 'Sarah Williams', 'Team Gamma', false),
    ('player005', 'David Brown', 'Team Beta', false),
    ('player006', 'Lisa Davis', 'Team Gamma', false),
    ('player007', 'Tom Wilson', 'Team Alpha', false),
    ('player008', 'Emma Moore', 'Team Beta', false),
    ('player009', 'Chris Taylor', 'Team Gamma', false)
ON CONFLICT (username) DO NOTHING;

-- Seed initial admins data
INSERT INTO admins (username, nama) VALUES
    ('admin001', 'Administrator'),
    ('admin002', 'Game Master')
ON CONFLICT (username) DO NOTHING;

-- Seed initial games data
INSERT INTO games (id, name, description, status) VALUES
    ('1', 'Efficiency Race', 'Complete tasks as efficiently as possible', 'inactive'),
    ('2', 'Quiz Battle', 'Test your knowledge in various categories', 'inactive'),
    ('3', 'Team Challenge', 'Work together to solve complex problems', 'inactive')
ON CONFLICT (id) DO NOTHING;

-- Seed initial currency data
INSERT INTO currency (username, amount) VALUES
    ('player001', 0),
    ('player002', 0),
    ('player003', 0),
    ('player004', 0),
    ('player005', 0),
    ('player006', 0),
    ('player007', 0),
    ('player008', 0),
    ('player009', 0)
ON CONFLICT (username) DO NOTHING;
