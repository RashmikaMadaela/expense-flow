// Test case for settlements logic
// When User A creates a $20 shared expense with User B (split equally)
// Expected result: User B should owe User A $10

const testExpense = {
  id: "expense1",
  amount: 2000, // $20 in cents
  createdBy: "userA",
  participants: [
    { userId: "userA", share: 1000 }, // User A's $10 share
    { userId: "userB", share: 1000 }  // User B's $10 share
  ],
  settlements: [] // No settlements yet
};

// Expected settlements for User A:
// - User B owes User A: $10 (User B's share)
// - User A owes User B: $0

// Expected settlements for User B:
// - User A owes User B: $0  
// - User B owes User A: $10 (shown in User A's "Owed to Me")

console.log("Test case:", testExpense);
console.log("Expected: User B owes User A $10.00");