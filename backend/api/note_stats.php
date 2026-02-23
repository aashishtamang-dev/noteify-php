<?php
// Simple API to increment note views/downloads
// POST JSON: { "note_id": <int>, "action": "view" | "download" }

header('Content-Type: application/json');

include("../../config/db.php");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    mysqli_close($conn);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$note_id = isset($data['note_id']) ? intval($data['note_id']) : 0;
$action = isset($data['action']) ? strtolower(trim($data['action'])) : '';

if ($note_id <= 0 || !in_array($action, ['view', 'download'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid note_id or action']);
    mysqli_close($conn);
    exit;
}

// Ensure columns exist (safe-guard if DB was created without them)
try {
    $checkViews = @mysqli_query($conn, "SHOW COLUMNS FROM notes LIKE 'views'");
    if (!$checkViews || mysqli_num_rows($checkViews) == 0) {
        @mysqli_query($conn, "ALTER TABLE notes ADD COLUMN views INT DEFAULT 0");
    }

    $checkDownloads = @mysqli_query($conn, "SHOW COLUMNS FROM notes LIKE 'downloads'");
    if (!$checkDownloads || mysqli_num_rows($checkDownloads) == 0) {
        @mysqli_query($conn, "ALTER TABLE notes ADD COLUMN downloads INT DEFAULT 0");
    }
} catch (Exception $e) {
    // Ignore structural errors; counter update will fail below if table is broken
}

$column = $action === 'view' ? 'views' : 'downloads';

$note_id_safe = intval($note_id);
$sql = "UPDATE notes SET $column = IFNULL($column, 0) + 1 WHERE note_id = $note_id_safe";

if (!mysqli_query($conn, $sql)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update counter: ' . mysqli_error($conn)]);
    mysqli_close($conn);
    exit;
}

// Return updated row counters (best-effort; ignore errors)
$result = @mysqli_query(
    $conn,
    "SELECT note_id, IFNULL(views, 0) AS views, IFNULL(downloads, 0) AS downloads FROM notes WHERE note_id = $note_id_safe LIMIT 1"
);

if ($result && mysqli_num_rows($result) === 1) {
    $row = mysqli_fetch_assoc($result);
    echo json_encode([
        'success' => true,
        'note_id' => (int)$row['note_id'],
        'views' => (int)$row['views'],
        'downloads' => (int)$row['downloads']
    ]);
} else {
    echo json_encode([
        'success' => true,
        'note_id' => $note_id_safe
    ]);
}

mysqli_close($conn);
?>

