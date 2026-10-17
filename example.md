<!DOCTYPE html>

<html lang="vi"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Mô-đun 1: Giới thiệu về Kiểm tra phần mềm | Neko Study Space</title>
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<!-- Font Awesome Icons -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
<!-- Tailwind CSS CDN -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            neko: {
              primary: '#e06d44',
              hover: '#cf5a30',
              soft: '#faeae1',
              light: '#fff8f5',
              border: '#f3dacf',
              dark: '#3e2e28',
              muted: '#7a675e',
              accent: '#f59e0b',
              green: '#22c55e',
              greenBg: '#ecfdf5',
              greenText: '#15803d'
            }
          },
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          },
          boxShadow: {
            neko: '0 4px 20px -2px rgba(224, 109, 68, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
            card: '0 2px 12px rgba(90, 50, 30, 0.05)',
          }
        }
      }
    }
  </script>
<!-- BEGIN: Custom Styles -->
<style data-purpose="custom-theme">
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #faf5f0;
      color: #3e2e28;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #fbf5f2;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #ecd3c6;
      border-radius: 9999px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #e06d44;
    }
    .module-sublist {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
      opacity: 0;
    }
    .module-sublist.open {
      max-height: 600px;
      opacity: 1;
    }
    .module-arrow {
      transition: transform 0.25s ease;
    }
    .module-arrow.rotated {
      transform: rotate(90deg);
    }
  </style>
<!-- END: Custom Styles -->
</head>
<body class="min-h-screen flex flex-col bg-[#FAF5F0] text-neko-dark selection:bg-neko-primary selection:text-white">
<!-- BEGIN: MainHeader -->
<header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neko-border px-4 lg:px-8 py-3 transition-shadow">
<div class="max-w-[1680px] mx-auto flex items-center justify-between gap-4">
<!-- Brand & Course Logo -->
<div class="flex items-center gap-6">
<a class="flex items-center gap-2 group" href="#" title="Neko Study Space Trang chủ">
<div class="w-10 h-10 rounded-2xl bg-neko-primary flex items-center justify-center text-white text-lg shadow-sm group-hover:scale-105 transition-transform">
            🐾
          </div>
<div class="flex flex-col">
<span class="text-xl font-bold tracking-tight text-neko-dark flex items-center gap-1.5">
              Neko Study 
</span>
<span class="text-[11px] text-neko-muted font-medium">Không gian học tập ấm áp</span>
</div>
</a>
</div>
<!-- Search Bar -->
<div class="flex-1 max-w-xl mx-2 md:mx-6" data-purpose="search-container">
<form class="relative flex items-center w-full" onsubmit="event.preventDefault();">
<input class="w-full pl-11 pr-24 py-2.5 bg-[#FFF9F6] border border-neko-border rounded-xl text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-neko-primary/30 focus:border-neko-primary transition-all shadow-sm" placeholder="Tìm kiếm trong khóa học, bài giảng, tài liệu..." type="text"/>
<i class="fa-solid fa-magnifying-glass absolute left-4 text-neko-muted text-sm"></i>
<button class="absolute right-1.5 px-4 py-1.5 bg-neko-primary hover:bg-neko-hover text-white text-xs font-semibold rounded-lg transition-colors shadow-sm" type="submit">
            Tìm kiếm
          </button>
</form>
</div>
<!-- Right Utility Actions -->
<div class="flex items-center gap-3">
<!-- User Profile Avatar -->
<div class="flex items-center gap-2.5 pl-2 ml-1 border-l border-neko-border">
<div class="w-9 h-9 rounded-xl bg-neko-primary text-white font-bold flex items-center justify-center shadow-sm ring-2 ring-neko-soft">
            V
          </div>
<div class="hidden lg:flex flex-col text-left">
<span class="text-xs font-bold text-neko-dark leading-tight">Vinh Lê</span>
<span class="text-[10px] text-neko-muted">Thành viên Siêng năng</span>
</div>
</div>
</div>
</div>
</header>
<!-- END: MainHeader -->
<!-- BEGIN: MainContentArea -->
<div class="flex-1 max-w-[1680px] w-full mx-auto px-4 lg:px-8 py-6">
<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
<!-- BEGIN: LeftSidebar -->
<aside class="lg:col-span-3 bg-white rounded-2xl border border-neko-border/80 p-4 shadow-card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar" data-purpose="course-navigation-sidebar">
<!-- Course Header Tag -->
<div class="pb-4 mb-4 border-b border-neko-border">
<div class="flex items-center gap-3">
<div class="w-12 h-12 rounded-xl bg-[#7a0019] text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
              M
            </div>
<div>
<p class="text-[11px] font-semibold uppercase tracking-wider text-neko-muted">University of Minnesota</p>
<h2 class="text-sm font-bold text-neko-dark leading-tight mt-0.5">Giới thiệu về Kiểm tra phần mềm</h2>
</div>
</div>
</div>
<!-- Navigation Sections -->
<div class="space-y-4 text-sm">
<!-- Module Accordion List -->
<div>
<div class="flex items-center justify-between px-2 mb-2 text-xs font-bold uppercase tracking-wider text-neko-muted">
<span>Tài liệu Khoá Học</span>
<i class="fa-solid fa-chevron-up text-[10px]"></i>
</div>
<nav class="space-y-1.5" id="modulesAccordion">
<!-- Module 1 (Active & Expandable) -->
<div class="rounded-xl border border-neko-border/60 overflow-hidden bg-white shadow-sm transition-all">
<button class="w-full flex items-center justify-between px-3.5 py-2.5 bg-neko-soft text-neko-primary font-bold text-left transition-colors hover:bg-orange-100/70" onclick="toggleModule('mod1')" type="button">
<div class="flex items-center gap-2.5 truncate">
<span class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">
<i class="fa-solid fa-check"></i>
</span>
<span class="truncate text-xs font-bold text-neko-primary">Mô-đun 1: Tổng quan kiểm tra</span>
</div>
<div class="flex items-center gap-1.5 shrink-0 ml-1">
<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">100%</span>
<i class="module-arrow fa-solid fa-chevron-right text-[10px] text-neko-primary rotated" id="mod1-arrow"></i>
</div>
</button>
<!-- Nested Lessons Accordion -->
<div class="module-sublist open bg-[#FFFDFB] divide-y divide-neko-border/40 border-t border-neko-border/50 text-xs" id="mod1-sublist">
<!-- Cluster 0 -->
<div class="p-2.5 space-y-1.5">
<div class="flex items-center justify-between text-[11px] font-bold text-neko-dark px-1">
<span class="flex items-center gap-1.5">
<i class="fa-solid fa-paw text-[10px] text-neko-primary"></i> Bài học 0: Chào mừng
</span>
<span class="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">Hoàn thành</span>
</div>
<a class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary transition-all group" href="#lesson-0">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs shrink-0"></i>
<span class="truncate flex-1">Chào mừng bạn đến với Kiểm tra...</span>
<span class="text-[10px] text-neko-muted font-normal shrink-0">2p</span>
</a>
<a class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary transition-all group" href="#lesson-0">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs shrink-0"></i>
<span class="truncate flex-1">Hướng dẫn và quy tắc chung</span>
<span class="text-[10px] text-neko-muted font-normal shrink-0">5p</span>
</a>
</div>
<!-- Cluster 1 -->
<div class="p-2.5 space-y-1.5 bg-[#FFF9F6]/60">
<div class="flex items-center justify-between text-[11px] font-bold text-neko-dark px-1">
<span class="flex items-center gap-1.5">
<i class="fa-solid fa-paw text-[10px] text-neko-primary"></i> Bài học 1: Giới thiệu kiểm tra
</span>
<span class="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">Hoàn thành</span>
</div>
<a class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary transition-all group" href="#lesson-1">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs shrink-0"></i>
<span class="truncate flex-1">Định nghĩa Bug, Defect, Failure</span>
<span class="text-[10px] text-neko-muted font-normal shrink-0">12p</span>
</a>
<a class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary transition-all group" href="#lesson-1">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs shrink-0"></i>
<span class="truncate flex-1">Tổng quan kiểm thử thực tế &amp; Bài tập</span>
<span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded shrink-0">100%</span>
</a>
<a class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary transition-all group" href="#lesson-1">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs shrink-0"></i>
<span class="truncate flex-1">Bảng thuật ngữ tiêu chuẩn ISTQB</span>
<span class="text-[10px] text-neko-muted font-normal shrink-0">8p</span>
</a>
</div>
<!-- Cluster 2 -->
<div class="p-2.5 space-y-1.5">
<div class="flex items-center justify-between text-[11px] font-bold text-neko-dark px-1">
<span class="flex items-center gap-1.5">
<i class="fa-solid fa-paw text-[10px] text-neko-primary"></i> Bài học 2: Tại sao &amp; Cách kiểm tra
</span>
<span class="text-[9px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">Sắp tới</span>
</div>
<a class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-neko-dark/70 hover:bg-neko-soft hover:text-neko-primary transition-all group" href="#lesson-2">
<i class="fa-regular fa-circle-play text-stone-400 group-hover:text-neko-primary text-xs shrink-0"></i>
<span class="truncate flex-1">Tầm quan trọng của kiểm thử trong chu kỳ SDLC</span>
<span class="text-[10px] text-neko-muted font-normal shrink-0">15p</span>
</a>
</div>
</div>
</div>
<!-- Mo-dun 2 -->
<div class="rounded-xl border border-transparent hover:border-neko-border/60 overflow-hidden bg-white transition-all">
<button class="w-full flex items-center justify-between px-3.5 py-2.5 text-neko-dark/80 hover:bg-stone-50 hover:text-neko-primary font-semibold text-left transition-colors" onclick="toggleModule('mod2')" type="button">
<div class="flex items-center gap-2.5 truncate">
<span class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">
<i class="fa-solid fa-check"></i>
</span>
<span class="truncate text-xs">Mô-đun 2: Kiểm tra chức năng</span>
</div>
<div class="flex items-center gap-1.5 shrink-0 ml-1">
<span class="text-[10px] font-medium text-neko-muted">100%</span>
<i class="module-arrow fa-solid fa-chevron-right text-[10px] text-stone-400" id="mod2-arrow"></i>
</div>
</button>
<div class="module-sublist bg-[#FFFDFB] divide-y divide-neko-border/40 border-t border-neko-border/40 text-xs" id="mod2-sublist">
<div class="p-2.5 space-y-1.5">
<div class="flex items-center justify-between text-[11px] font-bold text-neko-dark px-1">
<span>Bài học 1: Phân vùng tương đương (EP)</span>
<span class="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 rounded">100%</span>
</div>
<a class="flex items-center gap-2 px-2 py-1 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary" href="#">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
<span class="truncate">Khái niệm và ứng dụng Equivalence Partitioning</span>
</a>
<a class="flex items-center gap-2 px-2 py-1 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary" href="#">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
<span class="truncate">Bài tập thực hành thiết kế Test Case EP</span>
</a>
</div>
</div>
</div>
<!-- Mo-dun 3 -->
<div class="rounded-xl border border-transparent hover:border-neko-border/60 overflow-hidden bg-white transition-all">
<button class="w-full flex items-center justify-between px-3.5 py-2.5 text-neko-dark/80 hover:bg-stone-50 hover:text-neko-primary font-semibold text-left transition-colors" onclick="toggleModule('mod3')" type="button">
<div class="flex items-center gap-2.5 truncate">
<span class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">
<i class="fa-solid fa-check"></i>
</span>
<span class="truncate text-xs">Mô-đun 3: Kiểm thử cấu trúc</span>
</div>
<div class="flex items-center gap-1.5 shrink-0 ml-1">
<span class="text-[10px] font-medium text-neko-muted">100%</span>
<i class="module-arrow fa-solid fa-chevron-right text-[10px] text-stone-400" id="mod3-arrow"></i>
</div>
</button>
<div class="module-sublist bg-[#FFFDFB] divide-y divide-neko-border/40 border-t border-neko-border/40 text-xs" id="mod3-sublist">
<div class="p-2.5 space-y-1.5">
<div class="flex items-center justify-between text-[11px] font-bold text-neko-dark px-1">
<span>Bài học 1: Kiểm thử hộp trắng</span>
<span class="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 rounded">100%</span>
</div>
<a class="flex items-center gap-2 px-2 py-1 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary" href="#">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
<span class="truncate">Độ bao phủ câu lệnh (Statement Coverage)</span>
</a>
</div>
</div>
</div>
<!-- Mo-dun 4 -->
<div class="rounded-xl border border-transparent hover:border-neko-border/60 overflow-hidden bg-white transition-all">
<button class="w-full flex items-center justify-between px-3.5 py-2.5 text-neko-dark/80 hover:bg-stone-50 hover:text-neko-primary font-semibold text-left transition-colors" onclick="toggleModule('mod4')" type="button">
<div class="flex items-center gap-2.5 truncate">
<span class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">
<i class="fa-solid fa-check"></i>
</span>
<span class="truncate text-xs">Mô-đun 4: Đánh giá &amp; Báo cáo</span>
</div>
<div class="flex items-center gap-1.5 shrink-0 ml-1">
<span class="text-[10px] font-medium text-neko-muted">100%</span>
<i class="module-arrow fa-solid fa-chevron-right text-[10px] text-stone-400" id="mod4-arrow"></i>
</div>
</button>
<div class="module-sublist bg-[#FFFDFB] divide-y divide-neko-border/40 border-t border-neko-border/40 text-xs" id="mod4-sublist">
<div class="p-2.5 space-y-1.5">
<div class="flex items-center justify-between text-[11px] font-bold text-neko-dark px-1">
<span>Bài học 1: Báo cáo kết quả và Defect Log</span>
<span class="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 rounded">100%</span>
</div>
<a class="flex items-center gap-2 px-2 py-1 rounded-lg text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary" href="#">
<i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
<span class="truncate">Tổng kết khóa học &amp; Đánh giá năng lực</span>
</a>
</div>
</div>
</div>
</nav>
</div>
<!-- Course Grades Link -->
<div class="pt-3 border-t border-neko-border">
<a class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-neko-dark/80 hover:bg-neko-soft hover:text-neko-primary font-medium transition-colors group" href="#">
<div class="flex items-center gap-3">
<i class="fa-solid fa-chart-simple w-4 text-neko-muted group-hover:text-neko-primary text-center"></i>
<span class="text-xs font-semibold">Bảng điểm &amp; Đánh giá</span>
</div>
<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">100%</span>
</a>
</div>
</div>
</aside>
<!-- END: LeftSidebar -->
<!-- BEGIN: CenterMainContent -->
<main class="lg:col-span-6 space-y-6" data-purpose="course-modules-content">
<!-- Lessons Accordion Group -->
<div class="space-y-4" data-purpose="course-lessons-list">
<!-- Lesson Section 0 -->
<div class="bg-white rounded-2xl border border-neko-border shadow-card overflow-hidden transition-all" id="lesson-0">
<div class="p-4 bg-[#FFF9F6] border-b border-neko-border/80 flex items-center justify-between cursor-pointer" onclick="toggleCard(this)">
<div class="flex items-center gap-2">
<i class="fa-solid fa-paw text-neko-primary text-sm"></i>
<h3 class="font-bold text-sm text-neko-dark">Bài học 0: Chào mừng</h3>
</div>
<div class="flex items-center gap-2">
<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Hoàn thành</span>
<button class="text-stone-400 hover:text-stone-600 p-1 card-chevron">
<i class="fa-solid fa-chevron-up text-xs"></i>
</button>
</div>
</div>
<div class="divide-y divide-stone-100 card-content">
<!-- Item 1: Video -->
<div class="p-4 hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4">
<div class="flex items-start gap-3">
<span class="mt-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
<i class="fa-solid fa-check"></i>
</span>
<div>
<h4 class="text-sm font-bold text-neko-dark hover:text-neko-primary cursor-pointer transition-colors">
                      Chào mừng bạn đến với Kiểm tra và Tự động hóa phần mềm!
                    </h4>
<p class="text-xs text-neko-muted mt-0.5 flex items-center gap-2">
<span class="flex items-center gap-1"><i class="fa-solid fa-video text-stone-400 text-[10px]"></i> Video</span>
<span class="">•</span>
<span class="">2 phút</span>
</p>
</div>
</div>
<button class="px-4 py-2 bg-neko-primary hover:bg-neko-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0">
                  Xem lại
                </button>
</div>
<!-- Item 2: Reading -->
<div class="p-4 hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4">
<div class="flex items-start gap-3">
<span class="mt-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
<i class="fa-solid fa-check"></i>
</span>
<div>
<h4 class="text-sm font-bold text-neko-dark hover:text-neko-primary cursor-pointer transition-colors">
                      Chào mừng đến với khóa học! Hướng dẫn và quy tắc chung
                    </h4>
<p class="text-xs text-neko-muted mt-0.5 flex items-center gap-2">
<span class="flex items-center gap-1"><i class="fa-regular fa-file-lines text-stone-400 text-[10px]"></i> Bài đọc</span>
<span class="">•</span>
<span class="">5 phút</span>
</p>
</div>
</div>
<span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Đã đọc</span>
</div>
</div>
</div>
<!-- Lesson Section 1 -->
<div class="bg-white rounded-2xl border border-neko-border shadow-card overflow-hidden transition-all" id="lesson-1">
<div class="p-4 bg-[#FFF9F6] border-b border-neko-border/80 flex items-center justify-between cursor-pointer" onclick="toggleCard(this)">
<div class="flex items-center gap-2">
<i class="fa-solid fa-paw text-neko-primary text-sm"></i>
<h3 class="font-bold text-sm text-neko-dark">Bài học 1: Giới thiệu về Kiểm tra</h3>
</div>
<div class="flex items-center gap-2">
<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Hoàn thành</span>
<button class="text-stone-400 hover:text-stone-600 p-1 card-chevron">
<i class="fa-solid fa-chevron-up text-xs"></i>
</button>
</div>
</div>
<div class="divide-y divide-stone-100 card-content">
<!-- Item 1: Video -->
<div class="p-4 hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4">
<div class="flex items-start gap-3">
<span class="mt-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
<i class="fa-solid fa-check"></i>
</span>
<div>
<h4 class="text-sm font-bold text-neko-dark hover:text-neko-primary cursor-pointer transition-colors">
                      Giới thiệu tổng quan và định nghĩa Bug, Defect, Failure
                    </h4>
<p class="text-xs text-neko-muted mt-0.5 flex items-center gap-2">
<span class="flex items-center gap-1"><i class="fa-solid fa-video text-stone-400 text-[10px]"></i> Video</span>
<span class="">•</span>
<span class="">12 phút</span>
</p>
</div>
</div>
<button class="px-4 py-1.5 border border-neko-border text-neko-primary hover:bg-neko-soft text-xs font-bold rounded-xl transition-all shrink-0">
                  Học lại
                </button>
</div>
<!-- Item 2: Assignment -->
<div class="p-4 hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4">
<div class="flex items-start gap-3">
<span class="mt-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
<i class="fa-solid fa-check"></i>
</span>
<div>
<h4 class="text-sm font-bold text-neko-dark hover:text-neko-primary cursor-pointer transition-colors">
                      Tổng quan kiểm thử thực tế &amp; Câu đố trắc nghiệm
                    </h4>
<p class="text-xs text-neko-muted mt-0.5 flex items-center gap-2">
<span class="flex items-center gap-1"><i class="fa-solid fa-pen-ruler text-stone-400 text-[10px]"></i> Bài tập Thực hành</span>
<span class="">•</span>
<span class="">Đã nộp • Điểm: <strong class="text-emerald-700">100%</strong></span>
<span class="">•</span>
<span class="text-emerald-600 font-semibold">Đã chấm điểm</span>
</p>
</div>
</div>
<span class="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-lg">Xem bài giải</span>
</div>
<!-- Item 3: Reading Glossary -->
<div class="p-4 hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4">
<div class="flex items-start gap-3">
<span class="mt-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
<i class="fa-solid fa-check"></i>
</span>
<div>
<h4 class="text-sm font-bold text-neko-dark hover:text-neko-primary cursor-pointer transition-colors">
                      Bảng thuật ngữ tiêu chuẩn ISTQB cần nhớ
                    </h4>
<p class="text-xs text-neko-muted mt-0.5 flex items-center gap-2">
<span class="flex items-center gap-1"><i class="fa-regular fa-file-lines text-stone-400 text-[10px]"></i> Bài đọc</span>
<span class="">•</span>
<span class="">8 phút</span>
</p>
</div>
</div>
<span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Đã đọc</span>
</div>
</div>
</div>
<!-- Lesson Section 2 -->
<div class="bg-white rounded-2xl border border-neko-border shadow-card overflow-hidden transition-all" id="lesson-2">
<div class="p-4 bg-[#FFF9F6] border-b border-neko-border/80 flex items-center justify-between cursor-pointer" onclick="toggleCard(this)">
<div class="flex items-center gap-2">
<i class="fa-solid fa-paw text-neko-primary text-sm"></i>
<h3 class="font-bold text-sm text-neko-dark">Bài học 2: Tại sao và cách chúng ta kiểm tra</h3>
</div>
<div class="flex items-center gap-2">
<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">Sắp tới</span>
<button class="text-stone-400 hover:text-stone-600 p-1 card-chevron">
<i class="fa-solid fa-chevron-up text-xs"></i>
</button>
</div>
</div>
<div class="divide-y divide-stone-100 card-content">
<!-- Item 1: Video -->
<div class="p-4 hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-4">
<div class="flex items-start gap-3">
<span class="mt-0.5 w-6 h-6 rounded-full bg-neko-soft text-neko-primary flex items-center justify-center text-xs shrink-0 shadow-sm">
<i class="fa-solid fa-play text-[10px]"></i>
</span>
<div>
<h4 class="text-sm font-bold text-neko-dark hover:text-neko-primary cursor-pointer transition-colors">
                      Tầm quan trọng của kiểm thử trong chu kỳ phát triển phần mềm (SDLC)
                    </h4>
<p class="text-xs text-neko-muted mt-0.5 flex items-center gap-2">
<span class="flex items-center gap-1"><i class="fa-solid fa-video text-stone-400 text-[10px]"></i> Video</span>
<span class="">•</span>
<span class="">15 phút</span>
</p>
</div>
</div>
<button class="px-4 py-2 bg-neko-primary hover:bg-neko-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0">
                  Bắt đầu học
                </button>
</div>
</div>
</div>
</div>
</main>
<!-- END: CenterMainContent -->
<!-- BEGIN: RightSidebar -->
<aside class="lg:col-span-3 space-y-6" data-purpose="course-sidebar-recommendations">
<!-- Recommended Courses Block -->
<section class="bg-white rounded-2xl border border-neko-border p-5 shadow-card" data-purpose="recommended-courses">
<div class="flex items-center justify-between mb-4">
<h3 class="font-bold text-sm text-neko-dark flex items-center gap-1.5">
<span class="">Bạn có thể thấy hữu ích</span>
<span class="text-neko-primary">🐾</span>
</h3>
<a class="text-[11px] font-bold text-neko-primary hover:underline" href="#">Xem thêm</a>
</div>
<div class="space-y-4">
<!-- Rec Card 1 -->
<a class="group flex gap-3 p-2.5 rounded-xl hover:bg-neko-soft/40 transition-colors border border-transparent hover:border-neko-border" href="#">
<div class="w-16 h-14 rounded-lg bg-stone-100 flex items-center justify-center text-xl shrink-0 border border-stone-200">
                💻
              </div>
<div class="flex-1 min-w-0">
<span class="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Board Infinity</span>
<h4 class="text-xs font-bold text-neko-dark group-hover:text-neko-primary line-clamp-2 transition-colors">
                  Automation and Modern Testing Tools
                </h4>
<div class="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-700">
<i class="fa-solid fa-star text-amber-500 text-[10px]"></i>
<span class="">4.0</span>
<span class="text-stone-400 font-normal">(1.2k)</span>
</div>
</div>
</a>
<!-- Rec Card 2 -->
<a class="group flex gap-3 p-2.5 rounded-xl hover:bg-neko-soft/40 transition-colors border border-transparent hover:border-neko-border" href="#">
<div class="w-16 h-14 rounded-lg bg-stone-100 flex items-center justify-center text-xl shrink-0 border border-stone-200">
                🧪
              </div>
<div class="flex-1 min-w-0">
<span class="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Board Infinity</span>
<h4 class="text-xs font-bold text-neko-dark group-hover:text-neko-primary line-clamp-2 transition-colors">
                  Introduction to Software Quality Assurance
                </h4>
<div class="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-700">
<i class="fa-solid fa-star text-amber-500 text-[10px]"></i>
<span class="">3.87</span>
<span class="text-stone-400 font-normal">(890)</span>
</div>
</div>
</a>
<!-- Rec Card 3 -->
<a class="group flex gap-3 p-2.5 rounded-xl hover:bg-neko-soft/40 transition-colors border border-transparent hover:border-neko-border" href="#">
<div class="w-16 h-14 rounded-lg bg-stone-100 flex items-center justify-center text-xl shrink-0 border border-stone-200">
                🏛️
              </div>
<div class="flex-1 min-w-0">
<span class="text-[10px] uppercase font-bold text-stone-400 tracking-wider">University of Leeds</span>
<h4 class="text-xs font-bold text-neko-dark group-hover:text-neko-primary line-clamp-2 transition-colors">
                  Foundations of Software Testing and Validation
                </h4>
<div class="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-700">
<i class="fa-solid fa-star text-amber-500 text-[10px]"></i>
<span class="">4.61</span>
<span class="text-stone-400 font-normal">(3.4k)</span>
</div>
</div>
</a>
</div>
</section>
<!-- Course Rating Box -->
<section class="bg-white rounded-2xl border border-neko-border p-5 shadow-card" data-purpose="course-feedback-card">
<h3 class="font-bold text-sm text-neko-dark mb-2">Đánh giá khóa học này</h3>
<p class="text-xs text-neko-muted mb-3">Đóng góp cảm nghĩ để Neko Study Space nâng cao trải nghiệm nhé!</p>
<div class="flex items-center justify-between py-2 px-3 bg-[#FFFDFB] border border-dashed border-neko-border rounded-xl">
<div class="flex items-center gap-1.5 text-stone-300">
<button class="hover:text-amber-400 text-lg transition-colors"><i class="fa-regular fa-star"></i></button>
<button class="hover:text-amber-400 text-lg transition-colors"><i class="fa-regular fa-star"></i></button>
<button class="hover:text-amber-400 text-lg transition-colors"><i class="fa-regular fa-star"></i></button>
<button class="hover:text-amber-400 text-lg transition-colors"><i class="fa-regular fa-star"></i></button>
<button class="hover:text-amber-400 text-lg transition-colors"><i class="fa-regular fa-star"></i></button>
</div>
<span class="text-[11px] font-medium text-stone-400">Không có đánh giá</span>
</div>
</section>
</aside>
<!-- END: RightSidebar -->
</div>
</div>
<!-- END: MainContentArea -->
<!-- BEGIN: MainFooter -->
<footer class="mt-auto border-t border-neko-border bg-white py-6 px-4 text-center text-xs text-neko-muted">
<div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
<div class="flex items-center gap-2"><span class="text-neko-primary font-bold">🐾 Neko Study Space</span></div>
<p class="">© 2026 Neko Study Space. Dành cho những giờ học bình yên và ngập tràn cảm hứng.</p>
<div class="flex gap-4 font-semibold text-neko-dark/70">
<a class="hover:text-neko-primary transition-colors" href="#">Điều khoản</a>
<a class="hover:text-neko-primary transition-colors" href="#">Bảo mật</a>
<a class="hover:text-neko-primary transition-colors" href="#">Hỗ trợ</a>
</div>
</div>
</footer>
<!-- END: MainFooter -->
<!-- Accordion Toggle Script -->
<script>
  function toggleModule(modId) {
    const sublist = document.getElementById(modId + '-sublist');
    const arrow = document.getElementById(modId + '-arrow');
    if (!sublist) return;

    const isOpen = sublist.classList.contains('open');
    if (isOpen) {
      sublist.classList.remove('open');
      if (arrow) arrow.classList.remove('rotated');
    } else {
      sublist.classList.add('open');
      if (arrow) arrow.classList.add('rotated');
    }
  }

  function toggleCard(headerEl) {
    const cardContent = headerEl.nextElementSibling;
    const chevron = headerEl.querySelector('.card-chevron i');
    if (!cardContent) return;
    
    if (cardContent.style.display === 'none') {
      cardContent.style.display = '';
      if (chevron) chevron.className = 'fa-solid fa-chevron-up text-xs';
    } else {
      cardContent.style.display = 'none';
      if (chevron) chevron.className = 'fa-solid fa-chevron-down text-xs';
    }
  }
</script>
</body></html>