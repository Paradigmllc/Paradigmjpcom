const CONTROL_PATH = process.env.PARADIGM_SSH_CONTROL_PATH || "/tmp/paradigm-release-ssh-%C"
const CONTROL_PERSIST_SECONDS = process.env.PARADIGM_SSH_CONTROL_PERSIST_SECONDS || "180"

/**
 * Reuse one authenticated SSH connection across release subprocesses.
 * Production rejects the sixth rapid connection, so release checks must share
 * a control socket instead of opening a fresh session for every command.
 */
export function sshArgs(target, { connectTimeout, acceptNew = false } = {}) {
  const args = [
    "-o", "BatchMode=yes",
  ]
  if (process.platform === "win32") {
    // Windows OpenSSH accepts ControlMaster flags but cannot create a Unix
    // control socket ("getsockname failed: Not a socket"). Retry direct
    // sessions because the production host rate-limits the sixth rapid login.
    args.push("-o", "ControlMaster=no", "-o", "ControlPath=none", "-o", "ConnectionAttempts=4")
  } else {
    args.push("-o", "ControlMaster=auto", "-o", `ControlPersist=${CONTROL_PERSIST_SECONDS}`, "-o", `ControlPath=${CONTROL_PATH}`)
  }
  if (connectTimeout || process.platform === "win32") args.push("-o", `ConnectTimeout=${connectTimeout ?? 20}`)
  if (acceptNew) args.push("-o", "StrictHostKeyChecking=accept-new")
  return [...args, target]
}
