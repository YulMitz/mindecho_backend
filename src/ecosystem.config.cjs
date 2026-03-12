module.exports = {
    apps: [
        {
            name: 'mind-echo-dev',
            script: './src/server.js',
            env_file: '.env',
            env: {
                NODE_ENV: 'development',
                PORT: 8442
            },
            watch: true,
            ignore_watch: ['node_modules', 'logs', '*.log'],
            instances: 1,
            exec_mode: 'fork', // 'cluster' or 'fork', 'fork' is default and usual for single instance.
            max_memory_restart: '512M',
            error_file: './logs/dev_err.log',
            out_file: './logs/dev_out.log',
            log_file: './logs/dev_combined.log',
            time: true, // Add timestamp to logs
        },
        {
            name: 'mind-echo-prod',
            script: './src/server.js',
            env_file: '.env',
            env: {
                NODE_ENV: 'production',
                PORT: 8443
            },
            watch: false,
            instances: 2, // PM2 will be the parent process to listen on 8443 and manage 2 server instances.
            exec_mode: 'cluster', // 'cluster' or 'fork', 'fork' is default and usual for single instance.
            max_memory_restart: '512M',
            error_file: './logs/prod_err.log',
            out_file: './logs/prod_out.log',
            log_file: './logs/prod_combined.log',
            time: true, // Add timestamp to logs
            restart_delay: 3000,
            max_restarts: 10,
            min_uptime: '10s'
        },
    ]
};