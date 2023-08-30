export const dynamicPayoutStructure = [
  { maxPlayers: 2, payouts: [1000] },
  { maxPlayers: 10, payouts: [700, 300] },
  { maxPlayers: 20, payouts: [400, 250, 200, 150] },
  { maxPlayers: 30, payouts: [350, 220, 150, 110, 90, 80] },
  { maxPlayers: 40, payouts: [330, 200, 120, 90, 80, 70, 60, 50] },
  { maxPlayers: 50, payouts: [310, 190, 98, 88, 78, 68, 55, 44, 37, 32] },
  {
    maxPlayers: 75,
    payouts: [290, 175, 89, 79, 69, 59, 47, 35, 29, 23, 21, 21, 21, 21, 21],
  },
  {
    maxPlayers: 100,
    payouts: [
      280, 170, 84, 75, 65, 55, 43, 29, 26, 18, 18, 18, 18, 18, 18, 13, 13, 13,
      13, 13,
    ],
  },
  {
    maxPlayers: 125,
    payouts: [
      270, 165, 82, 72, 62, 52, 40, 27, 24, 16, 16, 16, 16, 16, 16, 11.5, 11.5,
      11.5, 11.5, 11.5, 10.5, 10.5, 10.5, 10.5, 10.5,
    ],
  },
  //   {
  //     maxPlayers: 150,
  //     payouts: [
  //       260, 160, 81, 71, 61, 51, 39, 26, 23, 15.5, 15.5, 15.5, 15.5, 15.5, 15.5,
  //       10.5, 10.5, 10.5, 10.5, 10.5, 9, 9, 9, 9, 9, 7.5, 7.5, 7.5, 7.5, 7.5,
  //     ],
  //   },
  //   {
  //     maxPlayers: 200,
  //     payouts: [
  //       250, 155, 79, 69, 59, 49, 37, 24, 21, 14.5, 14.5, 14.5, 14.5, 14.5, 14.5,
  //       9.5, 9.5, 9.5, 9.5, 9.5, 7.5, 7.5, 7.5, 7.5, 7.5, 6, 6, 6, 6, 6, 5.5, 5.5,
  //       5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5,
  //     ],
  //   },
  //   {
  //     maxPlayers: 250,
  //     payouts: [
  //       240, 150, 78, 68, 58, 48, 36, 23, 20, 14, 14, 14, 14, 14, 14, 8, 8, 8, 8,
  //       8, 7, 7, 7, 7, 7, 5.5, 5.5, 5.5, 5.5, 5.5, 5, 5, 5, 5, 5, 4.5, 4.5, 4.5,
  //       4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5,
  //     ],
  //   },
  //   {
  //     maxPlayers: 300,
  //     payouts: [
  //       230, 145, 77, 67, 57, 47, 35, 22, 19, 13, 13, 13, 13, 13, 13, 8, 8, 8, 8,
  //       8, 7, 7, 7, 7, 7, 5.5, 5.5, 5.5, 5.5, 5.5, 5, 5, 5, 5, 5, 4.5, 4.5, 4.5,
  //       4.5, 4.5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3,
  //       3.3, 3.3, 3.3,
  //     ],
  //   },
  //   {
  //     maxPlayers: 400,
  //     payouts: [
  //       225, 142.5, 76, 66, 56, 46, 34, 21, 18, 12.5, 12.5, 12.5, 12.5, 12.5,
  //       12.5, 7.5, 7.5, 7.5, 7.5, 7.5, 6.5, 6.5, 6.5, 6.5, 6.5, 5.5, 5.5, 5.5,
  //       5.5, 5.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4, 4, 4, 4, 4, 3.5, 3.5, 3.5, 3.5, 3.5,
  //       3.5, 3.5, 3.5, 3.5, 3.5, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1,
  //       2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3, 2.3,
  //     ],
  //   },
  //   {
  //     maxPlayers: 500,
  //     payouts: [
  //       220, 140, 75, 65, 55, 45, 33, 20, 17, 12, 12, 12, 12, 12, 12, 7.5, 7.5,
  //       7.5, 7.5, 7.5, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3.5, 3.5, 3.5,
  //       3.5, 3.5, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 2.6, 2.6, 2.6,
  //       2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9,
  //       1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7,
  //       1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7,
  //       1.7, 1.7,
  //     ],
  //   },
  //   {
  //     maxPlayers: 600,
  //     payouts: [
  //       215, 137.5, 74, 64, 54, 44, 32, 19, 16, 11.5, 11.5, 11.5, 11.5, 11.5,
  //       11.5, 7, 7, 7, 7, 7, 5.5, 5.5, 5.5, 5.5, 5.5, 4.5, 4.5, 4.5, 4.5, 4.5,
  //       3.5, 3.5, 3.5, 3.5, 3.5, 3, 3, 3, 3, 3, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5,
  //       2.5, 2.5, 2.5, 2.2, 2.2, 2.2, 2.2, 2.2, 2.2, 2.2, 2.2, 2.2, 2.2, 1.9, 1.9,
  //       1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.7, 1.7,
  //       1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7,
  //       1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6,
  //       1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6,
  //       1.6, 1.6, 1.6,
  //     ],
  //   },
  //   {
  //     maxPlayers: 800,
  //     payouts: [
  //       210, 135, 74, 64, 54, 44, 32, 19, 16, 11.5, 11.5, 11.5, 11.5, 11.5, 11.5,
  //       6.5, 6.5, 6.5, 6.5, 6.5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2.5,
  //       2.5, 2.5, 2.5, 2.5, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 1.9,
  //       1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7,
  //       1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6,
  //       1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6,
  //       1.6, 1.6, 1.6, 1.6, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5,
  //       1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.4,
  //       1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4,
  //       1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4,
  //     ],
  //   },
  //   {
  //     maxPlayers: 900,
  //     payouts: [
  //       205, 132.5, 72, 62, 52, 42, 30, 18, 15, 11, 11, 11, 11, 11, 11, 6, 6, 6,
  //       6, 6, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2.5, 2.5, 2.5, 2.5,
  //       2.5, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 1.9, 1.9, 1.9, 1.9,
  //       1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7,
  //       1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5,
  //       1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5,
  //       1.5, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4,
  //       1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.3, 1.3, 1.3, 1.3,
  //       1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3,
  //       1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3,
  //       1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3,
  //       1.3,
  //     ],
  //   },
  //   {
  //     maxPlayers: 1000,
  //     payouts: [
  //       200, 130, 72, 62, 52, 42, 30, 18, 15, 11, 11, 11, 11, 11, 11, 6, 6, 6, 6,
  //       6, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2.5, 2.5, 2.5, 2.5, 2.5,
  //       2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 1.8, 1.8, 1.8, 1.8, 1.8,
  //       1.8, 1.8, 1.8, 1.8, 1.8, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6,
  //       1.6, 1.6, 1.6, 1.6, 1.6, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3,
  //       1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3,
  //       1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2,
  //       1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2,
  //       1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2,
  //       1.2, 1.2, 1.2, 1.2, 1.2, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1,
  //       1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1,
  //       1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1,
  //       1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1,
  //     ],
  //   },
];
