# 🎬 Thumbnail Generator - Full-Stack Application

A modern, scalable thumbnail generation system built with **Node.js/Fastify**, **Next.js**, **MongoDB**, **BullMQ + Redis**, **Sharp**, **FFmpeg**, and **Socket.io**.

## 🏗️ System Architecture

This application follows a **microservices architecture** with real-time capabilities:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js UI   │    │  Fastify API    │    │  Worker Process │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│  (Processing)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   Socket.IO     │◄─────────────┘
                        │  (Real-time)    │
                        └─────────────────┘
                                 │
                    ┌─────────────────────────────┐
                    │                             │
            ┌───────▼────────┐          ┌────────▼────────┐
            │    MongoDB     │          │     Redis       │
            │  (Database)    │          │ (Queue/Cache)   │
            └────────────────┘          └─────────────────┘
```

## 🚀 Features

### ✅ User Authentication
- **JWT-based authentication** with secure HTTP-only cookies
- **User registration and login** with password hashing (bcrypt)
- **Protected routes** and middleware

### 📁 File Upload System
- **Multi-file drag & drop upload** with React Dropzone
- **Support for images and videos** (JPEG, PNG, GIF, WebP, MP4, AVI, MOV, etc.)
- **File validation** (type, size limits up to 100MB)
- **Real-time upload progress**

### 🔄 Queue-Based Processing
- **BullMQ + Redis** for reliable job queuing
- **Per-user FIFO ordering** ensures jobs process in order
- **Automatic retry** mechanism for failed jobs
- **Concurrent processing** with configurable worker concurrency

### 🖼️ Thumbnail Generation
- **Images**: Sharp library for high-quality resizing (128x128px)
- **Videos**: FFmpeg extracts mid-point frame + Sharp for resizing
- **Optimized output** with JPEG compression and progressive loading

### 📡 Real-time Updates
- **Socket.IO** for live status updates
- **Redis Pub/Sub** for scalable real-time communication
- **Live progress tracking** (Queued → Processing → Completed/Failed)

### 🎨 Modern UI
- **Shadcn/ui components** with Tailwind CSS
- **Responsive design** that works on all devices
- **Dark/light theme support**
- **Interactive dashboard** with filtering and sorting

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Fastify** - High-performance web framework
- **TypeScript** - Type safety and better DX
- **MongoDB** - Document database with Mongoose ODM
- **BullMQ** - Redis-based job queue
- **Redis** - In-memory cache and message broker
- **Sharp** - High-performance image processing
- **FFmpeg** - Video processing and frame extraction
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - Secure authentication tokens
- **bcrypt** - Password hashing

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful, accessible components
- **Jotai** - Atomic state management
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **Socket.IO Client** - Real-time updates
- **React Dropzone** - File upload interface

### DevOps & Tools
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **ESLint** - Code linting
- **Prettier** - Code formatting
