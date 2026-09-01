# Build da API Spring Boot a partir do monorepo.
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY backend-java/pom.xml ./pom.xml
RUN mvn -B -DskipTests dependency:go-offline

COPY backend-java/src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

ENV PORT=3001
EXPOSE 3001

ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS:-} -Dserver.port=${PORT} -jar /app/app.jar"]
