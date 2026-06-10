/**
 * report-i18n-vi-id.ts — Vietnamese (Tiếng Việt) + Indonesian (Bahasa Indonesia)
 * vi: Kính ngữ (respectful tone)
 * id: Formal "Anda"
 */

import type { ReportLocaleData } from "./report-i18n-shared"

/* ═══════════════════════════════════════════════════════════════════════════
   vi — Vietnamese (Tiếng Việt)  |  Kính ngữ (respectful tone)
   ═══════════════════════════════════════════════════════════════════════════ */

export const VI: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Báo cáo chẩn đoán điều hành",
    validity: "Có hiệu lực đến",
    heroKicker: "Đánh giá kinh doanh riêng tư",
    heroLead:
      "Dựa trên dữ liệu công khai, tín hiệu thu thập được và bản demo cải thiện, chúng tôi đã xác định bước đầu tiên rõ ràng nhất giữa doanh thu, niềm tin và luồng yêu cầu.",
    evidenceReady: "Dữ liệu đã thu thập",
    sourceCoverage: "Phạm vi bằng chứng",
    monthlyLoss: "Tổn thất cơ hội hàng tháng ước tính",
    confidence: "Độ tin cậy của bằng chứng",
    currentState: "Điểm ma sát hiện tại",
    improvedState: "Trạng thái sau cải thiện",
    diagnosticSurface: "Phạm vi chẩn đoán",
    priorityFindings: "Phát hiện ưu tiên",
    businessImpact: "Tác động kinh doanh",
    firstMove: "Hành động đầu tiên",
    whyItMatters: "Tại sao quan trọng",
    evidence: "Bằng chứng",
    recommendation: "Hành động đề xuất",
    roadmap: "Lộ trình 30 ngày",
    dataAppendix: "Sổ dữ liệu",
    sourceMeaning: "Ý nghĩa kinh doanh",
    sourceNext: "Bước kiểm tra tiếp theo",
    sourceMissing:
      "Các nguồn dữ liệu còn thiếu không được coi là sự thật, mà là giả thuyết cần xác minh trong lần đánh giá tiếp theo.",
    templateDirection: "Hướng đề xuất",
    qualityBar: "Tiêu chuẩn chất lượng",
    finalHeading: "Dành 30 phút để chọn cải thiện đầu tiên",
    finalBody:
      "Trước khi xây dựng lại toàn diện, hãy xác định đường dẫn phục hồi dễ nhất giữa cơ hội doanh thu, bằng chứng niềm tin và luồng yêu cầu.",
    emailSubject: "Về báo cáo chẩn đoán",
    competitorBenchmark: "So sánh đối thủ cạnh tranh và ngành",
    yourSite: "Trang web của Quý vị",
    industryAvg: "Trung bình ngành",
    topCompetitors: "Đối thủ hàng đầu",
    roiTitle: "Mô phỏng ROI dự kiến",
    paybackPeriod: "Thời gian thu hồi vốn ước tính",
    recoveredTwelveMonths: "Doanh thu thu hồi trong 12 tháng",
    roiLabel: "ROI dự kiến",
    faqTitle: "Câu hỏi thường gặp",
    readMore: "Đọc phân tích chi tiết",
  },
  cta: [
    "Xem demo cải thiện",
    "Đặt lịch tư vấn miễn phí",
    "Đọc chẩn đoán đầy đủ",
    "Bắt đầu cải thiện ngay",
  ],
  faq: [
    {
      q: "Chúng tôi có cần từ bỏ hosting hoặc tên miền hiện tại không?",
      a: "Không. Chúng tôi xây dựng và kiểm thử lớp trình bày hiệu suất cao trong môi trường staging và hoán đổi không gián đoạn sau khi được phê duyệt. Cơ sở hạ tầng hiện tại của Quý vị không bị ảnh hưởng — chúng tôi đã nâng điểm Lighthouse từ 40 lên hơn 90 điểm mà không cần thay đổi backend trong hàng chục dự án.",
    },
    {
      q: "Điểm Lighthouse di động 85+ có thực sự được đảm bảo không?",
      a: "Có. Gói tối ưu hóa Astro/Next.js của chúng tôi đảm bảo điểm Lighthouse di động tối thiểu 85 điểm. Nếu không đạt được ngưỡng này, chúng tôi sẽ hoàn trả toàn bộ phí tối ưu hiệu suất. Điểm trung bình của tất cả dự án từ năm 2024 là 92 điểm.",
    },
    {
      q: "Quy trình diễn ra như thế nào và mất bao lâu?",
      a: "Kiểm tra cơ bản (3 ngày) → Xây dựng lại trực quan bằng Astro/Next.js (5–7 ngày) → Xác thực staging (3 ngày) → Triển khai chính thức (1 ngày). Toàn bộ chu kỳ hoàn thành trong vòng 2 tuần. Quý vị chỉ cần tham gia hai điểm: cuộc họp khởi động và phê duyệt cuối cùng.",
    },
    {
      q: "Dịch vụ này có hoạt động cùng với đại lý hoặc đội ngũ nội bộ hiện tại của chúng tôi không?",
      a: "Hoàn toàn có thể. Chúng tôi hoạt động như một lớp hiệu suất phẫu thuật — chúng tôi không cần thay thế đại lý, CMS hoặc đội ngũ phát triển nội bộ của Quý vị. Chúng tôi cung cấp một lớp trình bày độc lập tích hợp liền mạch và bàn giao các mẫu có thể chỉnh sửa mà không cần lập trình.",
    },
    {
      q: "Dịch vụ này có phù hợp với doanh nghiệp vừa và nhỏ tại Việt Nam không?",
      a: "Có. Gói dịch vụ của chúng tôi được thiết kế phù hợp với điều kiện thị trường Việt Nam: tối ưu hóa cho tốc độ mạng 3G/4G phổ biến, hỗ trợ đa nền tảng thanh toán nội địa (Momo, ZaloPay, VNPay), tích hợp với Zalo OA và Facebook cho doanh nghiệp, cùng chiến lược SEO phù hợp với hành vi tìm kiếm của người dùng Việt.",
    },
  ],
  reassurance: [
    "14 ngày để cải thiện — từ khởi động đến triển khai chỉ trong 2 tuần",
    "Hiệu suất được đảm bảo — hoàn tiền đầy đủ nếu không đạt Lighthouse 85+",
    "Hơn 50 doanh nghiệp đã phục vụ — sản xuất, xây dựng, dịch vụ chuyên nghiệp, làm đẹp và hơn thế nữa",
    "Triển khai không gián đoạn — hệ thống hiện tại vẫn hoạt động trong suốt quá trình",
  ],
  offerBadges: [
    "Kết quả nhanh chóng",
    "Chỉnh sửa không cần code",
    "Tối ưu cho di động",
    "Hỗ trợ đa ngôn ngữ",
    "Đảm bảo chất lượng",
  ],
  culturalNotes: {
    toneDescription:
      "Sử dụng kính ngữ trong toàn bộ báo cáo (Quý vị, Quý doanh nghiệp). Tiếng Việt trang trọng phù hợp với văn bản kinh doanh nhưng không quá cứng nhắc. Doanh nhân Việt Nam đánh giá cao sự tôn trọng, cụ thể và minh bạch. Tránh dùng từ địa phương — sử dụng tiếng Việt phổ thông dễ hiểu trên toàn quốc.",
    formalityLevel: "Kính ngữ (trang trọng, tôn trọng)",
    pronounPreference: "Quý vị / Quý doanh nghiệp (đại từ kính ngữ trong thương mại)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   id — Indonesian (Bahasa Indonesia)  |  Formal "Anda"
   ═══════════════════════════════════════════════════════════════════════════ */

export const ID: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Laporan diagnostik eksekutif",
    validity: "Berlaku hingga",
    heroKicker: "Penilaian bisnis privat",
    heroLead:
      "Berdasarkan data publik, sinyal yang terkumpul, dan demo perbaikan, kami telah mengidentifikasi langkah pertama yang paling jelas di antara pendapatan, kepercayaan, dan alur permintaan.",
    evidenceReady: "Data terkumpul",
    sourceCoverage: "Cakupan bukti",
    monthlyLoss: "Estimasi kehilangan peluang bulanan",
    confidence: "Tingkat kepercayaan bukti",
    currentState: "Gesekan saat ini",
    improvedState: "Kondisi setelah perbaikan",
    diagnosticSurface: "Cakupan diagnosis",
    priorityFindings: "Temuan prioritas",
    businessImpact: "Dampak bisnis",
    firstMove: "Langkah pertama",
    whyItMatters: "Mengapa penting",
    evidence: "Bukti",
    recommendation: "Tindakan yang direkomendasikan",
    roadmap: "Peta jalan 30 hari",
    dataAppendix: "Buku data",
    sourceMeaning: "Makna bisnis",
    sourceNext: "Pemeriksaan berikutnya",
    sourceMissing:
      "Sumber yang hilang tidak dianggap sebagai fakta, melainkan sebagai hipotesis untuk ditinjau pada pemeriksaan berikutnya.",
    templateDirection: "Arah proposal",
    qualityBar: "Standar kualitas",
    finalHeading: "Gunakan 30 menit untuk memilih perbaikan pertama",
    finalBody:
      "Sebelum pembangunan ulang besar, identifikasi jalur pemulihan termudah antara peluang pendapatan, bukti kepercayaan, dan alur permintaan.",
    emailSubject: "Tentang laporan diagnostik",
    competitorBenchmark: "Perbandingan pesaing dan tolok ukur industri",
    yourSite: "Situs Anda",
    industryAvg: "Rata-rata industri",
    topCompetitors: "Pesaing teratas",
    roiTitle: "Simulasi proyeksi ROI",
    paybackPeriod: "Estimasi periode pengembalian",
    recoveredTwelveMonths: "Pendapatan pulih dalam 12 bulan",
    roiLabel: "ROI yang diproyeksikan",
    faqTitle: "Pertanyaan umum",
    readMore: "Baca analisis selengkapnya",
  },
  cta: [
    "Lihat demo perbaikan",
    "Jadwalkan konsultasi gratis",
    "Baca diagnosis lengkap",
    "Mulai perbaikan sekarang",
  ],
  faq: [
    {
      q: "Apakah kami harus meninggalkan hosting atau domain yang ada?",
      a: "Tidak. Kami membangun dan menguji lapisan presentasi berkinerja tinggi di lingkungan staging dan menggantinya tanpa waktu henti setelah disetujui. Infrastruktur Anda saat ini tidak tersentuh — kami telah meningkatkan skor Lighthouse dari 40 ke lebih dari 90 tanpa menyentuh backend di puluhan proyek.",
    },
    {
      q: "Apakah skor Lighthouse seluler 85+ benar-benar dijamin?",
      a: "Ya. Paket optimalisasi Astro/Next.js kami menjamin skor Lighthouse seluler minimal 85 poin. Jika kami tidak mencapai ambang ini, kami mengembalikan penuh biaya optimalisasi performa. Rata-rata skor semua proyek sejak 2024 adalah 92 poin.",
    },
    {
      q: "Bagaimana prosesnya dan berapa lama waktu yang dibutuhkan?",
      a: "Audit awal (3 hari) → Pembangunan ulang visual menggunakan Astro/Next.js (5–7 hari) → Validasi staging (3 hari) → Peluncuran produksi (1 hari). Seluruh siklus selesai hanya dalam 2 minggu. Anda hanya perlu berpartisipasi dalam dua titik: rapat awal dan persetujuan akhir.",
    },
    {
      q: "Apakah ini bisa bekerja bersama agensi atau tim internal kami yang sudah ada?",
      a: "Tentu. Kami beroperasi sebagai lapisan performa bedah — kami tidak perlu mengganti agensi, CMS, atau tim pengembangan internal Anda. Kami memberikan lapisan presentasi mandiri yang terintegrasi dengan lancar dan menyerahkan template yang dapat diedit tanpa coding untuk dipelihara oleh tim Anda.",
    },
    {
      q: "Apakah layanan ini cocok untuk UKM di Indonesia?",
      a: "Ya. Paket kami dirancang dengan mempertimbangkan kondisi pasar Indonesia: optimalisasi untuk koneksi seluler yang dominan, integrasi dengan platform pembayaran lokal (GoPay, OVO, Dana, QRIS), dukungan untuk ekosistem e-commerce Indonesia, serta strategi SEO yang mempertimbangkan perilaku pencarian pengguna Indonesia di Google dan media sosial. Kami juga memahami pentingnya kehadiran di WhatsApp Business dan marketplace seperti Tokopedia dan Shopee.",
    },
  ],
  reassurance: [
    "14 hari menuju perbaikan — dari awal hingga peluncuran hanya dalam 2 minggu",
    "Performa dijamin — pengembalian dana penuh jika Lighthouse 85+ tidak tercapai",
    "Lebih dari 50 UKM telah dilayani — manufaktur, konstruksi, jasa profesional, kecantikan, dan lainnya",
    "Peluncuran tanpa downtime — sistem Anda tetap berjalan sepanjang proses",
  ],
  offerBadges: [
    "Hasil cepat",
    "Dapat diedit tanpa koding",
    "Dioptimalkan untuk seluler",
    "Dukungan multi-bahasa",
    "Performa dijamin",
  ],
  culturalNotes: {
    toneDescription:
      "Bahasa Indonesia formal dengan konsistensi penggunaan 'Anda' sebagai kata ganti orang kedua. Gaya bahasa bisnis Indonesia yang sopan, lugas, dan tidak bertele-tele. Pelaku UKM Indonesia menghargai penjelasan yang konkret, manfaat yang jelas, dan transparansi — hindari istilah teknis yang tidak perlu. Gunakan format angka dan mata uang sesuai konvensi Indonesia.",
    formalityLevel: "Bahasa Indonesia formal (Anda)",
    pronounPreference: "Anda (baku, formal, bentuk hormat standar bisnis)",
  },
}
