using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Serenity.ComponentModel;

namespace DSRFQ
{
    [NestedLocalTexts]
    public static partial class AppConfigHelper
    {
        private static IConfiguration _configuration;

        // Initialize configuration (can be called during app startup)
        public static void Initialize(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // Retrieve value by key
        public static string GetConfigValue(string key)
        {
            if (_configuration == null)
                throw new InvalidOperationException("Configuration not initialized.");

            return _configuration[key];
        }
    }
}