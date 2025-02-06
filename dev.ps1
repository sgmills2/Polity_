$backendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    yarn dev:backend 
}

$frontendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    yarn dev:frontend 
}

# Show output from both jobs in real-time
while ($true) {
    Receive-Job -Job $backendJob, $frontendJob
    if (($backendJob.State -eq 'Completed') -or ($frontendJob.State -eq 'Completed')) {
        break
    }
    Start-Sleep -Milliseconds 100
}

# Clean up
Remove-Job -Job $backendJob, $frontendJob -Force 