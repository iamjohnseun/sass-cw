-- PhotoShare Database Schema
-- Run this script in your Azure SQL Database

-- Users Table
CREATE TABLE [dbo].[Users] (
    [UserId] INT IDENTITY(1,1) PRIMARY KEY,
    [GoogleId] NVARCHAR(255) NOT NULL UNIQUE,
    [Email] NVARCHAR(255) NOT NULL UNIQUE,
    [Name] NVARCHAR(255) NOT NULL,
    [ProfilePicture] NVARCHAR(512),
    [Role] NVARCHAR(50) NOT NULL DEFAULT 'consumer',
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [IsActive] BIT DEFAULT 1
);

-- Photos Table
CREATE TABLE [dbo].[Photos] (
    [PhotoId] INT IDENTITY(1,1) PRIMARY KEY,
    [UserId] INT NOT NULL,
    [Title] NVARCHAR(255) NOT NULL,
    [Caption] NVARCHAR(1000),
    [Location] NVARCHAR(255),
    [ImageUrl] NVARCHAR(512) NOT NULL,
    [ThumbnailUrl] NVARCHAR(512),
    [Views] INT DEFAULT 0,
    [Likes] INT DEFAULT 0,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [IsPublished] BIT DEFAULT 1,
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
);

-- Likes Table
CREATE TABLE [dbo].[Likes] (
    [LikeId] INT IDENTITY(1,1) PRIMARY KEY,
    [PhotoId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY ([PhotoId]) REFERENCES [dbo].[Photos]([PhotoId]) ON DELETE CASCADE,
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    UNIQUE ([PhotoId], [UserId])
);

-- Comments Table
CREATE TABLE [dbo].[Comments] (
    [CommentId] INT IDENTITY(1,1) PRIMARY KEY,
    [PhotoId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [Text] NVARCHAR(1000) NOT NULL,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY ([PhotoId]) REFERENCES [dbo].[Photos]([PhotoId]) ON DELETE CASCADE,
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
);

-- Tags Table (for categorizing photos)
CREATE TABLE [dbo].[Tags] (
    [TagId] INT IDENTITY(1,1) PRIMARY KEY,
    [TagName] NVARCHAR(100) NOT NULL UNIQUE
);

-- Photo_Tags Junction Table
CREATE TABLE [dbo].[Photo_Tags] (
    [PhotoId] INT NOT NULL,
    [TagId] INT NOT NULL,
    PRIMARY KEY ([PhotoId], [TagId]),
    FOREIGN KEY ([PhotoId]) REFERENCES [dbo].[Photos]([PhotoId]) ON DELETE CASCADE,
    FOREIGN KEY ([TagId]) REFERENCES [dbo].[Tags]([TagId]) ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX idx_Photos_UserId ON [dbo].[Photos]([UserId]);
CREATE INDEX idx_Photos_CreatedAt ON [dbo].[Photos]([CreatedAt]);
CREATE INDEX idx_Likes_PhotoId ON [dbo].[Likes]([PhotoId]);
CREATE INDEX idx_Comments_PhotoId ON [dbo].[Comments]([PhotoId]);
CREATE INDEX idx_Users_Email ON [dbo].[Users]([Email]);
