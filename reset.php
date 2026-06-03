<?php
$u = App\Models\User::find(0);
if (!$u) $u = App\Models\User::first();
$u->password = Hash::make('CoolifyAdmin123!');
$u->save();
echo "OK: Password reset for user ID {$u->id}\n";
