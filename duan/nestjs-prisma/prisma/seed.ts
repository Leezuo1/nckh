import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Bat dau seed data...');

  // Xoa data cu
  await prisma.activity.deleteMany();
  await prisma.document.deleteMany();
  await prisma.timeline.deleteMany();
  await prisma.topicParticipant.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.user.deleteMany();

  // ===== TAO USERS =====

  const admin = await prisma.user.create({
    data: {
      fullName: 'Nguyen Dinh Thuan',
      userId: 'ADMIN001',
      faculty: 'Cong Nghe Thong Tin',
      gender: 'Male',
      phone: '0900000001',
      outlook: 'thuan.admin@vanlanguni.vn',
      role: 'Admin',
      status: 'Active',
    },
  });

  const gv1 = await prisma.user.create({
    data: {
      fullName: 'Nguyen Le Duy Thinh',
      userId: 'GV001',
      faculty: 'Cong Nghe Thong Tin',
      gender: 'Male',
      phone: '0900000002',
      outlook: 'thinh.nld@vanlanguni.vn',
      role: 'Lecturer',
      status: 'Active',
    },
  });

  const gv2 = await prisma.user.create({
    data: {
      fullName: 'Pham Minh Duc',
      userId: 'GV002',
      faculty: 'IoT va He Thong Nhung',
      gender: 'Male',
      phone: '0900000003',
      outlook: 'duc.pm@vanlanguni.vn',
      role: 'Lecturer',
      status: 'Active',
    },
  });

  const gv3 = await prisma.user.create({
    data: {
      fullName: 'Tran Thi Huong',
      userId: 'GV003',
      faculty: 'Thiet Ke Vi Mach',
      gender: 'Female',
      phone: '0900000004',
      outlook: 'huong.tt@vanlanguni.vn',
      role: 'Lecturer',
      status: 'Active',
    },
  });

  const sv1 = await prisma.user.create({
    data: {
      fullName: 'Nguyen Viet Hai',
      userId: '2474802010476',
      faculty: 'Cong Nghe Thong Tin',
      batch: 'K28',
      gender: 'Male',
      phone: '0900000005',
      outlook: 'hai.nv2474@vanlanguni.vn',
      role: 'Student',
      status: 'Active',
    },
  });

  const sv2 = await prisma.user.create({
    data: {
      fullName: 'Dau Quang Minh',
      userId: '2474802010477',
      faculty: 'Cong Nghe Thong Tin',
      batch: 'K28',
      gender: 'Male',
      phone: '0900000006',
      outlook: 'minh.dq2474@vanlanguni.vn',
      role: 'Student',
      status: 'Active',
    },
  });

  const sv3 = await prisma.user.create({
    data: {
      fullName: 'Le Minh Tri',
      userId: '2374802010478',
      faculty: 'IoT va He Thong Nhung',
      batch: 'K27',
      gender: 'Male',
      phone: '0900000007',
      outlook: 'tri.lm2374@vanlanguni.vn',
      role: 'Student',
      status: 'Active',
    },
  });

  const sv4 = await prisma.user.create({
    data: {
      fullName: 'Nguyen Nhat Van',
      userId: '2274802010479',
      faculty: 'Thiet Ke Vi Mach',
      batch: 'K26',
      gender: 'Male',
      phone: '0900000008',
      outlook: 'van.nn2274@vanlanguni.vn',
      role: 'Student',
      status: 'Active',
    },
  });

  const sv5 = await prisma.user.create({
    data: {
      fullName: 'Tran Thi Bich Ngoc',
      userId: '2474802010480',
      faculty: 'Cong Nghe Thong Tin',
      batch: 'K28',
      gender: 'Female',
      phone: '0900000009',
      outlook: 'ngoc.ttb2474@vanlanguni.vn',
      role: 'Student',
      status: 'Active',
    },
  });

  console.log('Tao users xong!');

  // ===== TAO DE TAI (isAssigned = true) =====

  const topic1 = await prisma.topic.create({
    data: {
      topicId: 'NCKH-2026-001',
      topicName: 'Ung dung Cong nghe Object Detection vao He thong IoT',
      description: 'Ung dung cac bo dieu khien ESP32/STM32 ket hop cam bien nhiet do va GPS de theo doi kien hang 24/7.',
      objective: 'Xay dung he thong giam sat thong minh su dung AI va IoT',
      projectScope: 'Cong Nghe Thong Tin',
      expectedProduct: 'He thong prototype va bao cao khoa hoc',
      year: '2026',
      status: 'InProgress',
      progress: 45,
      isAssigned: true,
      isApproved: true,
      submitterId: sv1.id,
      deadline: new Date('2026-12-31'),
    },
  });

  await prisma.topicParticipant.createMany({
    data: [
      { topicId: topic1.id, userId: gv1.id, topicParticipantRole: 'Supervisor' },
      { topicId: topic1.id, userId: sv1.id, topicParticipantRole: 'Leader' },
      { topicId: topic1.id, userId: sv2.id, topicParticipantRole: 'Member' },
    ],
  });

  const topic2 = await prisma.topic.create({
    data: {
      topicId: 'NCKH-2026-002',
      topicName: 'Mang cam bien khong day (WSN) giam sat chat luong nuoc nuoi trong',
      description: 'Xay dung mang cam bien khong day de giam sat chat luong nuoc trong ao nuoi thuy san.',
      objective: 'Ung dung IoT trong nong nghiep thong minh',
      projectScope: 'IoT va He Thong Nhung',
      expectedProduct: 'He thong cam bien va ung dung mobile',
      year: '2026',
      status: 'Done',
      progress: 100,
      isAssigned: true,
      isApproved: true,
      submitterId: sv3.id,
      deadline: new Date('2026-06-30'),
    },
  });

  await prisma.topicParticipant.createMany({
    data: [
      { topicId: topic2.id, userId: gv2.id, topicParticipantRole: 'Supervisor' },
      { topicId: topic2.id, userId: sv3.id, topicParticipantRole: 'Leader' },
    ],
  });

  const topic3 = await prisma.topic.create({
    data: {
      topicId: 'NCKH-2026-003',
      topicName: 'Thiet ke loi xu ly RISC-V tich hop cac tap lenh tuy chinh',
      description: 'Nghien cuu va thiet ke loi xu ly RISC-V tich hop cac tap lenh tuy chinh cho ung dung nhung.',
      objective: 'Phat trien vi xu ly tuy chinh hieu nang cao',
      projectScope: 'Thiet Ke Vi Mach',
      expectedProduct: 'Chip prototype va tai lieu thiet ke',
      year: '2026',
      status: 'Pending',
      progress: 10,
      isAssigned: true,
      isApproved: true,
      submitterId: sv4.id,
      deadline: new Date('2026-12-31'),
    },
  });

  await prisma.topicParticipant.createMany({
    data: [
      { topicId: topic3.id, userId: gv3.id, topicParticipantRole: 'Supervisor' },
      { topicId: topic3.id, userId: sv4.id, topicParticipantRole: 'Leader' },
    ],
  });

  const topic4 = await prisma.topic.create({
    data: {
      topicId: 'NCKH-2025-001',
      topicName: 'He thong diem danh sinh vien bang nhan dien khuon mat',
      description: 'Xay dung he thong diem danh tu dong su dung cong nghe nhan dien khuon mat tich hop voi phan mem quan ly.',
      objective: 'Tu dong hoa quy trinh diem danh trong truong hoc',
      projectScope: 'Cong Nghe Thong Tin',
      expectedProduct: 'Ung dung web va mobile hoan chinh',
      year: '2025',
      status: 'Cancelled',
      progress: 30,
      isAssigned: true,
      isApproved: true,
      submitterId: sv5.id,
      deadline: new Date('2025-12-31'),
    },
  });

  await prisma.topicParticipant.createMany({
    data: [
      { topicId: topic4.id, userId: gv1.id, topicParticipantRole: 'Supervisor' },
      { topicId: topic4.id, userId: sv5.id, topicParticipantRole: 'Leader' },
    ],
  });

  console.log('Tao de tai xong!');

  // ===== TAO Y TUONG (isAssigned = false) =====

  await prisma.topic.create({
    data: {
      topicId: 'IDEA-2026-001',
      topicName: 'Ung dung Federated Learning trong bao mat du lieu y te',
      description: 'Nghien cuu va ung dung Federated Learning de bao mat du lieu y te phan tan.',
      objective: 'Bao ve quyen rieng tu du lieu y te bang AI phan tan',
      projectScope: 'Cong Nghe Thong Tin',
      year: '2026',
      status: 'Pending',
      progress: 0,
      isAssigned: false,
      isApproved: true,
      submitterId: sv1.id,
      deadline: new Date('2026-12-31'),
    },
  });

  await prisma.topic.create({
    data: {
      topicId: 'IDEA-2026-002',
      topicName: 'Xay dung he thong chatbot ho tro sinh vien dua tren NLP',
      description: 'Phat trien chatbot thong minh su dung xu ly ngon ngu tu nhien de ho tro sinh vien.',
      objective: 'Nang cao trai nghiem hoc tap cua sinh vien',
      projectScope: 'Cong Nghe Thong Tin',
      year: '2026',
      status: 'Pending',
      progress: 0,
      isAssigned: false,
      isApproved: true,
      submitterId: sv2.id,
      deadline: new Date('2026-12-31'),
    },
  });

  await prisma.topic.create({
    data: {
      topicId: 'IDEA-2026-003',
      topicName: 'He thong giam sat nang luong thong minh trong toa nha',
      description: 'Ung dung IoT va AI de toi uu hoa viec su dung nang luong trong toa nha van phong.',
      objective: 'Giam thieu tieu thu dien nang va chi phi van hanh',
      projectScope: 'IoT va He Thong Nhung',
      year: '2026',
      status: 'Pending',
      progress: 0,
      isAssigned: false,
      isApproved: true,
      submitterId: sv3.id,
      deadline: new Date('2026-12-31'),
    },
  });

  await prisma.topic.create({
    data: {
      topicId: 'IDEA-2026-004',
      topicName: 'Ung dung Computer Vision nhan dien benh cay trong qua anh',
      description: 'Su dung deep learning de phan tich anh cay trong va phat hien benh som.',
      objective: 'Ho tro nong dan phat hien benh cay trong chinh xac',
      projectScope: 'Cong Nghe Thong Tin',
      year: '2026',
      status: 'Pending',
      progress: 0,
      isAssigned: false,
      isApproved: false,
      submitterId: sv4.id,
      deadline: new Date('2026-12-31'),
    },
  });

  await prisma.topic.create({
    data: {
      topicId: 'IDEA-2026-005',
      topicName: 'Nghien cuu mo hinh Deep Learning phat hien gian lan tai chinh',
      description: 'Ap dung cac mo hinh deep learning de phat hien giao dich bat thuong trong he thong tai chinh.',
      objective: 'Nang cao bao mat he thong tai chinh ngan hang',
      projectScope: 'Cong Nghe Thong Tin',
      year: '2026',
      status: 'Pending',
      progress: 0,
      isAssigned: false,
      isApproved: false,
      submitterId: sv5.id,
      deadline: new Date('2026-12-31'),
    },
  });

  console.log('Tao y tuong xong!');

  // ===== TAO TIMELINES cho topic1 =====
  await prisma.timeline.createMany({
    data: [
      { topicId: topic1.id, timelineName: 'Phan tich yeu cau', deadline: new Date('2026-03-31'), isCompleted: true, completed: new Date('2026-03-28') },
      { topicId: topic1.id, timelineName: 'Thiet ke he thong', deadline: new Date('2026-05-31'), isCompleted: true, completed: new Date('2026-05-20') },
      { topicId: topic1.id, timelineName: 'Lap trinh va thu nghiem', deadline: new Date('2026-09-30'), isCompleted: false },
      { topicId: topic1.id, timelineName: 'Bao cao va nghiem thu', deadline: new Date('2026-12-31'), isCompleted: false },
    ],
  });

  console.log('\n===== SEED XONG =====');
  console.log('Users:');
  console.log('  Admin   : thuan.admin@vanlanguni.vn');
  console.log('  GV 1    : thinh.nld@vanlanguni.vn');
  console.log('  GV 2    : duc.pm@vanlanguni.vn');
  console.log('  GV 3    : huong.tt@vanlanguni.vn');
  console.log('  SV 1    : hai.nv2474@vanlanguni.vn (co de tai dang thuc hien)');
  console.log('  SV 2    : minh.dq2474@vanlanguni.vn');
  console.log('  SV 3    : tri.lm2374@vanlanguni.vn');
  console.log('  SV 4    : van.nn2274@vanlanguni.vn');
  console.log('  SV 5    : ngoc.ttb2474@vanlanguni.vn');
  console.log('\nDe tai: 4 (InProgress/Done/Pending/Cancelled)');
  console.log('Y tuong: 5 (Pending - cho duyet)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
